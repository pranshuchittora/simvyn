import type { WsEnvelope } from "@simvyn/types";
import {
	createContext,
	createElement,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

type WsHandler = (payload: unknown) => void;
type ListenerKey = `${string}:${string}`;

interface WsContextValue {
	ws: WebSocket | null;
	connected: boolean;
	send: (envelope: WsEnvelope) => void;
	addListener: (channel: string, type: string, handler: WsHandler) => () => void;
}

const WsContext = createContext<WsContextValue | null>(null);

const MAX_RETRIES = 10;
const RECONNECT_DELAY = 2000;

export function WsProvider({ children }: { children: ReactNode }) {
	const [connected, setConnected] = useState(false);
	const wsRef = useRef<WebSocket | null>(null);
	const retriesRef = useRef(0);
	const listenersRef = useRef(new Map<ListenerKey, Set<WsHandler>>());

	const connect = useCallback(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const url = `${protocol}//${window.location.host}/ws`;
		const socket = new WebSocket(url);

		socket.onopen = () => {
			setConnected(true);
			retriesRef.current = 0;
			socket.send(
				JSON.stringify({ channel: "system", type: "subscribe", payload: { channel: "devices" } }),
			);
			socket.send(JSON.stringify({ channel: "devices", type: "list", payload: {} }));
		};

		socket.onclose = () => {
			setConnected(false);
			wsRef.current = null;
			if (retriesRef.current < MAX_RETRIES) {
				retriesRef.current++;
				setTimeout(connect, RECONNECT_DELAY);
			}
		};

		socket.onerror = () => {
			socket.close();
		};

		socket.onmessage = (event) => {
			try {
				const envelope = JSON.parse(event.data) as WsEnvelope;
				const key: ListenerKey = `${envelope.channel}:${envelope.type}`;
				const handlers = listenersRef.current.get(key);
				if (handlers) {
					for (const handler of handlers) {
						handler(envelope.payload);
					}
				}
			} catch {
				// ignore malformed messages
			}
		};

		wsRef.current = socket;
	}, []);

	useEffect(() => {
		connect();
		return () => {
			retriesRef.current = MAX_RETRIES; // prevent reconnect on unmount
			wsRef.current?.close();
		};
	}, [connect]);

	const send = useCallback((envelope: WsEnvelope) => {
		const ws = wsRef.current;
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(envelope));
		}
	}, []);

	const addListener = useCallback((channel: string, type: string, handler: WsHandler) => {
		const key: ListenerKey = `${channel}:${type}`;
		if (!listenersRef.current.has(key)) {
			listenersRef.current.set(key, new Set());
		}
		listenersRef.current.get(key)!.add(handler);

		return () => {
			const handlers = listenersRef.current.get(key);
			if (handlers) {
				handlers.delete(handler);
				if (handlers.size === 0) {
					listenersRef.current.delete(key);
				}
			}
		};
	}, []);

	const value: WsContextValue = { ws: wsRef.current, connected, send, addListener };

	return createElement(WsContext.Provider, { value }, children);
}

export function useWs(): WsContextValue {
	const ctx = useContext(WsContext);
	if (!ctx) throw new Error("useWs must be used within WsProvider");
	return ctx;
}

export function useWsListener(channel: string, type: string, handler: WsHandler) {
	const { addListener } = useWs();

	useEffect(() => {
		return addListener(channel, type, handler);
	}, [addListener, channel, type, handler]);
}
