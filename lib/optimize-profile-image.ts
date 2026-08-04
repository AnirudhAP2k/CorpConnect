const MAX_AVATAR_DIMENSION = 512;
const WEBP_QUALITY = 0.82;

/**
 * Resizes a profile image in the browser before upload and converts it to WebP.
 * The aspect ratio is preserved and neither dimension will exceed 512 pixels.
 */
export async function optimizeProfileImage(file: File): Promise<File> {
    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await loadImage(objectUrl);
        const scale = Math.min(
            1,
            MAX_AVATAR_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
        );
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Your browser could not process this image.");

        context.drawImage(image, 0, 0, width, height);

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (result) => {
                    if (result) resolve(result);
                    else reject(new Error("Your browser could not optimize this image."));
                },
                "image/webp",
                WEBP_QUALITY
            );
        });

        const baseName = file.name.replace(/\.[^.]+$/, "") || "profile-avatar";
        return new File([blob], `${baseName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("The selected image could not be read."));
        image.src = src;
    });
}
