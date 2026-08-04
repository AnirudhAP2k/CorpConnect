"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateUserProfileAction } from "@/domain/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleUpload } from "@/lib/file-uploader";
import { optimizeProfileImage } from "@/lib/optimize-profile-image";

const DEFAULT_AVATARS = [
    { src: "/assets/avatars/avatar-blue.svg", label: "Blue" },
    { src: "/assets/avatars/avatar-violet.svg", label: "Violet" },
    { src: "/assets/avatars/avatar-amber.svg", label: "Amber" },
    { src: "/assets/avatars/avatar-emerald.svg", label: "Emerald" },
] as const;

const ACCEPTED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
]);
const MAX_SOURCE_SIZE = 10 * 1024 * 1024;

interface ProfileEditFormProps {
    initialName: string;
    initialImage: string;
}

export function ProfileEditForm({
    initialName,
    initialImage,
}: ProfileEditFormProps) {
    const router = useRouter();
    const [name, setName] = useState(initialName);
    const [image, setImage] = useState(initialImage);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    function selectDefaultAvatar(src: string) {
        setImage(src);
        setImageFile(null);
        setImagePreview("");
        setError("");
    }

    function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
            setError("Choose a JPG, PNG, WebP, or AVIF image.");
            event.target.value = "";
            return;
        }

        if (file.size > MAX_SOURCE_SIZE) {
            setError("The selected image must be smaller than 10 MB.");
            event.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => setImagePreview(String(reader.result));
        reader.readAsDataURL(file);

        setImageFile(file);
        setImage("");
        setError("");
    }

    function removeImage() {
        setImage("");
        setImageFile(null);
        setImagePreview("");
        setError("");
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        startTransition(async () => {
            try {
                let imageUrl = image;

                if (imageFile) {
                    const optimizedImage = await optimizeProfileImage(imageFile);
                    const uploadResult = await handleUpload(
                        [optimizedImage],
                        "profile-avatars",
                        { imagePreset: "avatar" }
                    );

                    if (!uploadResult?.imageUrl) {
                        throw new Error(uploadResult?.message || "Profile image upload failed.");
                    }

                    imageUrl = uploadResult.imageUrl;
                }

                const result = await updateUserProfileAction({
                    name: name.trim(),
                    image: imageUrl,
                });

                if ("error" in result) {
                    setError(result.error);
                    return;
                }

                toast.success("Profile updated successfully.");
                router.push("/profile");
                router.refresh();
            } catch (uploadError) {
                setError(
                    uploadError instanceof Error
                        ? uploadError.message
                        : "Profile image upload failed."
                );
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="profile-name">Display name</Label>
                <Input
                    id="profile-name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    maxLength={100}
                    disabled={isPending}
                    required
                />
            </div>

            <fieldset className="space-y-4" disabled={isPending}>
                <legend className="text-sm font-medium">Profile image</legend>
                <p className="text-xs text-nx-on-surface-variant">
                    Choose an avatar or upload your own image.
                </p>

                <div
                    className="grid grid-cols-4 gap-3 sm:grid-cols-6"
                    role="group"
                    aria-label="Default profile avatars"
                >
                    {DEFAULT_AVATARS.map((avatar) => (
                        <button
                            key={avatar.src}
                            type="button"
                            onClick={() => selectDefaultAvatar(avatar.src)}
                            aria-label={`Use ${avatar.label} avatar`}
                            aria-pressed={image === avatar.src && !imageFile}
                            className={`aspect-square overflow-hidden rounded-2xl border-2 p-0.5 transition ${
                                image === avatar.src && !imageFile
                                    ? "border-nx-primary ring-2 ring-nx-primary/20"
                                    : "border-transparent hover:border-nx-outline"
                            }`}
                        >
                            <Image
                                src={avatar.src}
                                alt=""
                                width={96}
                                height={96}
                                className="h-full w-full rounded-[13px]"
                            />
                        </button>
                    ))}

                    <label
                        className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-nx-on-surface-variant transition hover:border-nx-primary hover:text-nx-primary ${
                            imageFile ? "border-nx-primary ring-2 ring-nx-primary/20" : "border-nx-outline"
                        }`}
                    >
                        {imagePreview ? (
                            <Image
                                src={imagePreview}
                                alt="Custom avatar preview"
                                width={96}
                                height={96}
                                unoptimized
                                className="h-full w-full rounded-[13px] object-cover"
                            />
                        ) : (
                            <>
                                <ImagePlus className="mb-1 h-5 w-5" />
                                <span className="text-[10px] font-medium">Upload</span>
                            </>
                        )}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            className="sr-only"
                            onChange={handleImageChange}
                        />
                    </label>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-nx-surface-container-low px-4 py-3">
                    <p className="text-xs text-nx-on-surface-variant">
                        Uploads are resized to 512 px and saved as optimized WebP.
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeImage}
                        className="shrink-0 text-nx-on-surface-variant"
                    >
                        <Trash2 />
                        Remove
                    </Button>
                </div>
            </fieldset>

            {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                </p>
            )}

            <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" asChild disabled={isPending}>
                    <Link href="/profile">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Save />
                    )}
                    {isPending ? "Saving…" : "Save changes"}
                </Button>
            </div>
        </form>
    );
}
