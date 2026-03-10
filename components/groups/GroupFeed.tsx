"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User as UserIcon } from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Post {
    id: string;
    content: string;
    createdAt: Date;
    authorOrg: { id: string; name: string; logo: string | null };
    authorUser: { id: string; name: string | null; image: string | null };
}

export default function GroupFeed({ groupId, initialPosts }: { groupId: string, initialPosts: any[] }) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        if (!content.trim()) return;

        setIsPosting(true);
        try {
            const res = await axios.post(`/api/groups/${groupId}/posts`, { content });
            // Add new post to top of list
            setPosts([res.data, ...posts]);
            setContent("");
            toast.success("Posted successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Something went wrong creating the post.");
        } finally {
            setIsPosting(false);
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Create Post Field */}
            <form onSubmit={handlePost} className="bg-card p-4 rounded-lg border flex flex-col gap-3">
                <Textarea
                    placeholder="Share an update, ask a question, or start a discussion..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[100px] resize-none border-none focus-visible:ring-0 px-0 bg-transparent text-lg"
                />
                <div className="flex justify-end border-t pt-3">
                    <Button type="submit" disabled={!content.trim() || isPosting} size="sm">
                        <Send className="w-4 h-4 mr-2" />
                        {isPosting ? "Posting..." : "Share Update"}
                    </Button>
                </div>
            </form>

            {/* Feed List */}
            <div className="space-y-4">
                {posts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                        No posts yet. Be the first to start a discussion!
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="bg-card p-5 rounded-lg border space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-muted border flex items-center justify-center shrink-0 overflow-hidden">
                                    {(post.authorUser.image || post.authorOrg.logo) ? (
                                        <img src={post.authorUser.image || post.authorOrg.logo || undefined} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">
                                            {post.authorUser.name || "Unknown User"}
                                        </p>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <p className="text-xs font-semibold text-primary">
                                            {post.authorOrg.name}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                            <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                                {post.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
