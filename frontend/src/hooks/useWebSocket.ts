import { useState, useEffect, useCallback, useRef } from 'react';
import type { AgentMessage, AgentResponse } from '../types';

interface WSResponseMessage {
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

interface UseWebSocketOptions {
  url: string;
  token: string;
  onMessage?: (message: { type: string; payload: unknown }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  send: (message: AgentMessage) => Promise<AgentResponse>;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  retryAuth: (token: string) => Promise<boolean>;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { url } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRequestsRef = useRef<Map<string, { resolve: (value: AgentResponse) => void; reject: (error: Error) => void }>>(new Map());
  const requestIdRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 20;
  const pingIntervalRef = useRef<number | null>(null);
  const isIntentionalCloseRef = useRef(false);

  const generateRequestId = useCallback(() => {
    return `req_${++requestIdRef.current}_${Date.now()}`;
  }, []);

  const send = useCallback((message: AgentMessage): Promise<AgentResponse> => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = generateRequestId();
      const messageWithId = { ...message, requestId };

      pendingRequestsRef.current.set(requestId, { resolve, reject });

      ws.send(JSON.stringify(messageWithId));

      setTimeout(() => {
        if (pendingRequestsRef.current.has(requestId)) {
          pendingRequestsRef.current.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }, [generateRequestId]);

  const startHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    pingIntervalRef.current = window.setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        send({ type: 'ping', payload: {} }).catch(() => {});
      }
    }, 20000);
  }, [send]);

  const stopHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    isIntentionalCloseRef.current = false;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        startHeartbeat();

        const currentToken = optionsRef.current.token;
        if (currentToken) {
          send({ type: 'auth', payload: { token: currentToken } }).then(response => {
            if (response.success) {
              setIsAuthenticated(true);
              setError(null);
              optionsRef.current.onConnect?.();
            } else {
              setIsAuthenticated(false);
              setError('Authentication failed: ' + (response.error || 'Invalid token'));
            }
          }).catch(err => {
            setIsAuthenticated(false);
            setError('Authentication error: ' + err.message);
          });
        } else {
          setError('No token provided. Please enter token in Settings.');
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WSResponseMessage | { type: string; payload: unknown } = JSON.parse(event.data);

          if ('requestId' in message && message.requestId) {
            const response = message as WSResponseMessage;
            const pending = pendingRequestsRef.current.get(response.requestId);
            if (pending) {
              pendingRequestsRef.current.delete(response.requestId);
              if (response.success) {
                pending.resolve(response as AgentResponse);
              } else {
                pending.reject(new Error(response.error || 'Request failed'));
              }
            }
          } else {
            optionsRef.current.onMessage?.(message as { type: string; payload: unknown });
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        stopHeartbeat();
        setIsConnected(false);
        setIsAuthenticated(false);

        if (!isIntentionalCloseRef.current) {
          optionsRef.current.onDisconnect?.();

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 15000);
            console.log(`Reconnecting in ${Math.round(delay)}ms...`);
            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          } else {
            setError('Max reconnection attempts reached. Please refresh.');
          }
        } else {
          optionsRef.current.onDisconnect?.();
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        optionsRef.current.onError?.(err);
      };
    } catch (err) {
      setError('Failed to create connection: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [url, send, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    isIntentionalCloseRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    const ws = wsRef.current;
    if (ws) {
      ws.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    pendingRequestsRef.current.forEach(({ reject }) => {
      reject(new Error('Disconnected'));
    });
    pendingRequestsRef.current.clear();

    setIsConnected(false);
    setIsAuthenticated(false);
  }, [stopHeartbeat]);

  const retryAuth = useCallback(async (newToken: string) => {
    optionsRef.current.token = newToken;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
      return true;
    }

    try {
      const response = await send({ type: 'auth', payload: { token: newToken } });
      if (response.success) {
        setIsAuthenticated(true);
        setError(null);
        optionsRef.current.onConnect?.();
        return true;
      } else {
        setIsAuthenticated(false);
        setError('Authentication failed: ' + (response.error || 'Invalid token'));
        return false;
      }
    } catch (err) {
      setIsAuthenticated(false);
      setError('Authentication error: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  }, [send, connect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { send, isConnected, isAuthenticated, error, connect, disconnect, retryAuth };
}