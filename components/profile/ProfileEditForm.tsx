"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { setActiveOrganizationAction, updateUserProfileAction } from "@/domain/users";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

const MAX_BIO_LENGTH = 600;

interface ProfileEditFormProps {
    initialName: string;
    initialImage: string;
    initialHeadline: string;
    initialBio: string;
    initialLocation: string;
    initialPhone: string;
    initialLinkedinUrl: string;
    initialWebsiteUrl: string;
    initialTwitterUrl: string;
    initialTwoFactorEnabled: boolean;
    canUseTwoFactor: boolean;
    organizations: { id: string; name: string; logo: string | null }[];
    activeOrganizationId: string | null;
}

export function ProfileEditForm({
    initialName,
    initialImage,
    initialHeadline,
    initialBio,
    initialLocation,
    initialPhone,
    initialLinkedinUrl,
    initialWebsiteUrl,
    initialTwitterUrl,
    initialTwoFactorEnabled,
    canUseTwoFactor,
    organizations,
    activeOrganizationId,
}: ProfileEditFormProps) {
    const router = useRouter();
    const [name, setName] = useState(initialName);
    const [headline, setHeadline] = useState(initialHeadline);
    const [bio, setBio] = useState(initialBio);
    const [location, setLocation] = useState(initialLocation);
    const [phone, setPhone] = useState(initialPhone);
    const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
    const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
    const [twitterUrl, setTwitterUrl] = useState(initialTwitterUrl);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);
    const [organizationId, setOrganizationId] = useState(activeOrganizationId ?? "");
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
                    headline,
                    bio,
                    location,
                    phone,
                    linkedinUrl,
                    websiteUrl,
                    twitterUrl,
                    isTwoFactorEnabled: canUseTwoFactor ? twoFactorEnabled : undefined,
                });

                if ("error" in result) {
                    setError(result.error ?? "Failed to update profile. Please try again.");
                    return;
                }

                if (organizationId && organizationId !== activeOrganizationId) {
                    const orgResult = await setActiveOrganizationAction(organizationId);
                    if ("error" in orgResult && orgResult.error) {
                        setError(orgResult.error);
                        return;
                    }
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

            <div className="space-y-2">
                <Label htmlFor="profile-headline">Headline</Label>
                <Input
                    id="profile-headline"
                    name="headline"
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    placeholder="Head of Partnerships"
                    maxLength={120}
                    disabled={isPending}
                />
                <p className="text-xs text-nx-on-surface-variant">
                    Shown under your name instead of your organization role.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="profile-bio">About</Label>
                <Textarea
                    id="profile-bio"
                    name="bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="A short introduction for people you meet at events."
                    maxLength={MAX_BIO_LENGTH}
                    rows={4}
                    disabled={isPending}
                />
                <p className="text-xs text-nx-on-surface-variant">
                    {bio.length}/{MAX_BIO_LENGTH} characters
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="profile-location">Location</Label>
                    <Input
                        id="profile-location"
                        name="location"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        placeholder="Bengaluru, India"
                        maxLength={120}
                        disabled={isPending}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="profile-phone">Phone</Label>
                    <Input
                        id="profile-phone"
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                        maxLength={30}
                        disabled={isPending}
                    />
                </div>
            </div>

            <fieldset className="space-y-4" disabled={isPending}>
                <legend className="text-sm font-medium">Links</legend>

                <div className="space-y-2">
                    <Label htmlFor="profile-linkedin">LinkedIn</Label>
                    <Input
                        id="profile-linkedin"
                        name="linkedinUrl"
                        type="url"
                        value={linkedinUrl}
                        onChange={(event) => setLinkedinUrl(event.target.value)}
                        placeholder="https://www.linkedin.com/in/username"
                        inputMode="url"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="profile-website">Personal website</Label>
                    <Input
                        id="profile-website"
                        name="websiteUrl"
                        type="url"
                        value={websiteUrl}
                        onChange={(event) => setWebsiteUrl(event.target.value)}
                        placeholder="https://example.com"
                        inputMode="url"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="profile-twitter">X / Twitter</Label>
                    <Input
                        id="profile-twitter"
                        name="twitterUrl"
                        type="url"
                        value={twitterUrl}
                        onChange={(event) => setTwitterUrl(event.target.value)}
                        placeholder="https://x.com/username"
                        inputMode="url"
                    />
                </div>
            </fieldset>

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

            <fieldset className="space-y-4" disabled={isPending}>
                <legend className="text-sm font-medium">Preferences</legend>

                {organizations.length > 0 && (
                    <div className="space-y-2">
                        <Label htmlFor="profile-active-org">Active organization</Label>
                        <Select
                            value={organizationId}
                            onValueChange={setOrganizationId}
                            disabled={isPending}
                        >
                            <SelectTrigger id="profile-active-org">
                                <SelectValue placeholder="Select an organization" />
                            </SelectTrigger>
                            <SelectContent>
                                {organizations.map((organization) => (
                                    <SelectItem key={organization.id} value={organization.id}>
                                        {organization.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-nx-on-surface-variant">
                            Determines which organization&apos;s events and members you see.
                        </p>
                    </div>
                )}

                {canUseTwoFactor && (
                    <div className="flex items-start gap-3 rounded-xl bg-nx-surface-container-low px-4 py-3">
                        <Checkbox
                            id="profile-two-factor"
                            checked={twoFactorEnabled}
                            onCheckedChange={(checked) => setTwoFactorEnabled(checked === true)}
                            disabled={isPending}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="profile-two-factor">
                                Two-factor authentication
                            </Label>
                            <p className="text-xs text-nx-on-surface-variant">
                                Email a one-time code every time you sign in with your password.
                            </p>
                        </div>
                    </div>
                )}
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
                    {isPending && (
                        <Loader2 className="animate-spin" />
                    )}
                    {isPending ? "Saving…" : "Save changes"}
                </Button>
            </div>
        </form>
    );
}
