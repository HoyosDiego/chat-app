import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessage {
  UserName: string;
  Message: string;
  Platform: string;
  CreatedAt: Date | string | number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
    
  private messages$ = new BehaviorSubject<ChatMessage[]>([]);
  private connectionStatus$ = new BehaviorSubject<string>('Desconectado');
  private webSocket: WebSocket | null = null;
  private readonly hubUrl = 'ws://localhost:5000/chatHub';

  constructor() { }

  connect(): void {
    if (this.webSocket) {
      return;
    }

    try {
      this.webSocket = new WebSocket(this.hubUrl);

      this.webSocket.onopen = () => {
        this.connectionStatus$.next('Conectado');
        const handshake = JSON.stringify({ protocol: 'json', version: 1 }) + '\x1e';
        this.webSocket?.send(handshake);
      };

      this.webSocket.onmessage = (event) => {
        try {
          const rawData = event.data.split('\x1e');
          
          rawData.forEach((message: string) => {
            if (!message.trim()) {
              return;
            }

            const data = JSON.parse(message);

            if (data.type === 6) {
              this.webSocket?.send(JSON.stringify({ type: 6 }) + '\x1e');
              return;
            }

            if (data.type === 1 && data.target === 'ReceiveMessage') {
              const payload = data.arguments[0];
              const newMessage: ChatMessage = {
                UserName: payload.userName || 'Sistema',
                Message: payload.message || '',
                Platform: payload.platform || 'Desconocido',
                CreatedAt: payload.createdAt || new Date()
              };

              this.addMessage(newMessage);
            }
          });
        } catch (e) {
          console.error('Error procesando mensaje:', e);
        }
      };

      this.webSocket.onerror = () => {
        this.connectionStatus$.next('Error de conexión');
      };

      this.webSocket.onclose = () => {
        this.connectionStatus$.next('Desconectado');
        this.webSocket = null;
      };

    } catch (error) {
      this.connectionStatus$.next('Error de inicialización');
    }
  }

  private addMessage(message: ChatMessage): void {
    const currentMessages = this.messages$.value;
    if (currentMessages.length > 100) {
      currentMessages.shift();
    }
    this.messages$.next([...currentMessages, message]);
  }

  disconnect(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
  }

  getMessages(): Observable<ChatMessage[]> {
    return this.messages$.asObservable();
  }

  getConnectionStatus(): Observable<string> {
    return this.connectionStatus$.asObservable();
  }
}