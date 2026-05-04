import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatMessage, ConnectionStatus, ReceiveMessagePayload, SignalRMessageData, SignalRMessageType } from './chat.service.types';

@Injectable({
  providedIn: 'root'
})

export class ChatService implements OnDestroy {
  private readonly HUB_URL = 'ws://localhost:5000/chatHub';
  private readonly MAX_MESSAGES = 100;
  private readonly RECORD_SEPARATOR = '\x1e';
  private readonly RECONNECT_INTERVAL = 5000;

  private messages$ = new BehaviorSubject<ChatMessage[]>([]);
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.Disconnected);
  private webSocket: WebSocket | null = null;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;

  constructor() { }

  ngOnDestroy(): void {
    this.disconnect();
  }

  connect(): void {
    this.isIntentionalDisconnect = false;

    if (this.webSocket) {
      return;
    }

    this.connectionStatus$.next(ConnectionStatus.Connecting);

    try {
      this.webSocket = new WebSocket(this.HUB_URL);

      this.webSocket.onopen = this.handleOpen.bind(this);
      this.webSocket.onmessage = this.handleMessageEvent.bind(this);
      this.webSocket.onerror = this.handleError.bind(this);
      this.webSocket.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Error al inicializar WebSocket:', error);
      this.connectionStatus$.next(ConnectionStatus.InitError);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isIntentionalDisconnect = true;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    this.connectionStatus$.next(ConnectionStatus.Disconnected);
  }

  getMessages(): Observable<ChatMessage[]> {
    return this.messages$.asObservable();
  }

  getConnectionStatus(): Observable<string> {
    return this.connectionStatus$.asObservable();
  }

  private handleOpen(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.connectionStatus$.next(ConnectionStatus.Connected);
    this.sendHandshake();
  }

  private sendHandshake(): void {
    const handshake = JSON.stringify({ protocol: 'json', version: 1 }) + this.RECORD_SEPARATOR;
    this.sendRawMessage(handshake);
  }

  private handleMessageEvent(event: MessageEvent): void {
    try {
      const rawData = event.data.split(this.RECORD_SEPARATOR);

      rawData.forEach((message: string) => {
        if (message.trim()) {
          this.processSignalRMessage(message);
        }
      });
    } catch (error) {
      console.error('Error procesando evento de mensaje:', error, event.data);
    }
  }

  private processSignalRMessage(rawMessage: string): void {
    const data: SignalRMessageData = JSON.parse(rawMessage);

    switch (data.type) {
      case SignalRMessageType.Ping:
        this.handlePing();
        break;
      case SignalRMessageType.Invocation:
        this.handleInvocation(data);
        break;
    }
  }

  private handlePing(): void {
    this.sendRawMessage(JSON.stringify({ type: SignalRMessageType.Ping }) + this.RECORD_SEPARATOR);
  }

  private handleInvocation(data: SignalRMessageData): void {
    if (data.target === 'ReceiveMessage' && data.arguments && data.arguments.length > 0) {
      const payload = data.arguments[0] as ReceiveMessagePayload;
      const newMessage: ChatMessage = {
        UserName: payload.userName || 'Sistema',
        Message: payload.message || '',
        Platform: payload.platform || 'Desconocido',
        CreatedAt: payload.createdAt || new Date()
      };

      this.addMessage(newMessage);
    }
  }

  private sendRawMessage(message: string): void {
    if (this.webSocket?.readyState === WebSocket.OPEN) {
      this.webSocket.send(message);
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket Error:', event);
    this.connectionStatus$.next(ConnectionStatus.Error);
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket cerrado:', event?.code, event?.reason);
    this.connectionStatus$.next(ConnectionStatus.Disconnected);
    this.webSocket = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.isIntentionalDisconnect) {
      return;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(() => {
      console.log('Intentando reconectar al WebSocket...');
      this.connect();
    }, this.RECONNECT_INTERVAL);
  }

  private addMessage(message: ChatMessage): void {
    const currentMessages = this.messages$.value;

    if (currentMessages.length >= this.MAX_MESSAGES) {
      currentMessages.shift();
    }

    this.messages$.next([...currentMessages, message]);
  }
}