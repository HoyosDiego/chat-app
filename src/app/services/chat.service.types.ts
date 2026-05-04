export interface ChatMessage {
    UserName: string;
    Message: string;
    Platform: string;
    CreatedAt: Date | string | number;
}

export enum ConnectionStatus {
    Connected = 'Conectado',
    Disconnected = 'Desconectado',
    Connecting = 'Conectando...',
    Error = 'Error de conexión',
    InitError = 'Error de inicialización'
}

export enum SignalRMessageType {
    Invocation = 1,
    StreamItem = 2,
    Completion = 3,
    StreamInvocation = 4,
    CancelInvocation = 5,
    Ping = 6,
    Close = 7,
}

export interface ReceiveMessagePayload {
    userName?: string;
    message?: string;
    platform?: string;
    createdAt?: Date | string | number;
}

export interface SignalRMessageData {
    type?: SignalRMessageType;
    target?: string;
    arguments?: unknown[];
}