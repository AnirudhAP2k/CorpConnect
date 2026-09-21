"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export const useVirtualRoomSocket = (roomId: string, enabled = true) => {
	const { data: session } = useSession();
	const { socket, connected } = useSocket();
	const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
	const [reactions, setReactions] = useState<RoomReaction[]>([]);

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
		const onHandLowered = ({ userId }: { userId: string }) => {
			setRaisedHands((current) =>
				current.filter((item) => item.userId !== userId),
			);
		};
		const onReaction = (reaction: Omit<RoomReaction, "id">) => {
			const id = `${reaction.userId}-${Date.now()}-${Math.random()}`;
			setReactions((current) => [...current, { ...reaction, id }]);
			window.setTimeout(() => {
				setReactions((current) => current.filter((item) => item.id !== id));
			}, 3_000);
		};

		socket.on("hand_raised", onHandRaised);
		socket.on("hand_lowered", onHandLowered);
		socket.on("reaction_received", onReaction);
		window.addEventListener("pagehide", leaveRoom);

		return () => {
			leaveRoom();
			socket.off("hand_raised", onHandRaised);
			socket.off("hand_lowered", onHandLowered);
			socket.off("reaction_received", onReaction);
			window.removeEventListener("pagehide", leaveRoom);
		};
	}, [connected, enabled, roomId, socket]);

	const userId = session?.user?.id;
	const isHandRaised = useMemo(
		() => Boolean(userId && raisedHands.some((item) => item.userId === userId)),
		[raisedHands, userId],
	);

	const toggleHand = useCallback(() => {
		if (!socket || !connected) return;
		socket.emit(isHandRaised ? "lower_hand" : "raise_hand", roomId);
	}, [connected, isHandRaised, roomId, socket]);

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
		react,
	};
};
