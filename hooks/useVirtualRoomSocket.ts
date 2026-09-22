"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";

export interface RaisedHand {
	userId: string;
	activeOrgId: string;
	timestamp: string;
}

export interface RoomReaction {
	id: string;
	userId: string;
	emoji: string;
}

export interface VirtualRoomSocketOptions {
	enabled?: boolean;
	onAskUnmute?: (kind: "audio" | "video") => void;
}

export const useVirtualRoomSocket = (
	roomId: string,
	enabledOrOptions: boolean | VirtualRoomSocketOptions = true,
) => {
	const options =
		typeof enabledOrOptions === "boolean"
			? { enabled: enabledOrOptions }
			: enabledOrOptions;
	const { enabled = true, onAskUnmute } = options;

	const { data: session } = useSession();
	const { socket, connected } = useSocket();
	const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
	const [reactions, setReactions] = useState<RoomReaction[]>([]);
	const onAskUnmuteRef = useRef(onAskUnmute);

	useEffect(() => {
		onAskUnmuteRef.current = onAskUnmute;
	}, [onAskUnmute]);

	const userId = session?.user?.id;

	useEffect(() => {
		if (!socket || !connected || !roomId || !enabled) return;

		socket.emit("join_virtual_room", roomId);
		const leaveRoom = () => socket.emit("leave_virtual_room", roomId);

		const onHandRaised = (hand: RaisedHand) => {
			setRaisedHands((current) =>
				[...current.filter((item) => item.userId !== hand.userId), hand].sort(
					(a, b) => a.timestamp.localeCompare(b.timestamp),
				),
			);
		};
		const onHandLowered = ({ userId: loweredId }: { userId: string }) => {
			setRaisedHands((current) =>
				current.filter((item) => item.userId !== loweredId),
			);
		};
		const onReaction = (reaction: Omit<RoomReaction, "id">) => {
			const id = `${reaction.userId}-${Date.now()}-${Math.random()}`;
			setReactions((current) => [...current, { ...reaction, id }]);
			window.setTimeout(() => {
				setReactions((current) => current.filter((item) => item.id !== id));
			}, 3_000);
		};
		const onAskUnmuteRequested = (data: {
			targetUserId: string;
			hostUserId: string;
			kind: "audio" | "video";
		}) => {
			if (userId && data.targetUserId === userId) {
				onAskUnmuteRef.current?.(data.kind);
			}
		};

		socket.on("hand_raised", onHandRaised);
		socket.on("hand_lowered", onHandLowered);
		socket.on("reaction_received", onReaction);
		socket.on("ask_unmute_requested", onAskUnmuteRequested);
		window.addEventListener("pagehide", leaveRoom);

		return () => {
			leaveRoom();
			socket.off("hand_raised", onHandRaised);
			socket.off("hand_lowered", onHandLowered);
			socket.off("reaction_received", onReaction);
			socket.off("ask_unmute_requested", onAskUnmuteRequested);
			window.removeEventListener("pagehide", leaveRoom);
		};
	}, [connected, enabled, roomId, socket, userId]);

	const isHandRaised = useMemo(
		() => Boolean(userId && raisedHands.some((item) => item.userId === userId)),
		[raisedHands, userId],
	);

	const toggleHand = useCallback(() => {
		if (!socket || !connected) return;
		socket.emit(isHandRaised ? "lower_hand" : "raise_hand", roomId);
	}, [connected, isHandRaised, roomId, socket]);

	const lowerHand = useCallback(
		(targetUserId?: string) => {
			if (!socket || !connected) return;
			socket.emit("lower_hand", roomId, targetUserId);
		},
		[connected, roomId, socket],
	);

	const askUnmute = useCallback(
		(targetUserId: string, kind: "audio" | "video") => {
			if (!socket || !connected) return;
			socket.emit("ask_unmute", roomId, targetUserId, kind);
		},
		[connected, roomId, socket],
	);

	const react = useCallback(
		(emoji: string) => {
			if (!socket || !connected) return;
			socket.emit("react", roomId, emoji);
		},
		[connected, roomId, socket],
	);

	return {
		connected,
		raisedHands,
		reactions,
		isHandRaised,
		toggleHand,
		lowerHand,
		askUnmute,
		react,
	};
};
