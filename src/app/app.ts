import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './services/chat.service';
import { ChatMessage } from './services/chat.service.types';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
const URL_START = 'https://static-cdn.jtvnw.net/emoticons'
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  connectionStatus: string = 'Desconectado';
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.chatService.connect();

    this.chatService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.cdr.markForCheck();
          this.scrollToBottom();
        }
      });

    this.chatService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.connectionStatus = status;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.disconnect();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.messages-container') as HTMLElement;

      if (container) {
        container.scrollTop = container.scrollHeight;

        const messages = container.querySelectorAll('.message');
        if (messages.length > 0) {
          const lastMessage = [...messages].at(-1);
          lastMessage?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }

      }
    }, 50);
  }

  getPlatformIcon(platform: string): string {
    const p = platform.toLowerCase();
    if (p.includes('tiktok')) { return '/tiktokpng.png'; }
    if (p.includes('twitch')) { return '/twitchpng.png'; }
    return '/default-icon.png';
  }

  getUserColor(userName: string): string {
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).slice(-2);
    }
    return color;
  }

  public isEmote(message: string): boolean {
    if (!message) {
      return false;
    }

    return message.startsWith(URL_START);
  }

  public getMessageSegments(message: string) {
    const regex = /(https:\/\/static-cdn\.jtvnw\.net\/emoticons\/v2\/[^\s]+)/g;
    return message.split(regex).filter(part => part.length > 0);
  }

  public isSub(userName: string): boolean {
    const lower = userName.toLowerCase();
    return lower.includes('pro') || lower.includes('master') || lower.includes('sub');
  }
}