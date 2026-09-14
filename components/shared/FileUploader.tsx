import axios from "axios";
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "../ui/button";
import { CloudUpload, X } from "lucide-react";
import Image from "next/image";

interface FileUploaderProps {
    image: File | undefined | null;
    onFieldChange: (value: File | null) => void;
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const FileUploader = ({ onFieldChange, image, setFiles }: FileUploaderProps) => {
    const [localFiles, setLocalFiles] = useState<File[]>([]);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(acceptedFiles);
        setLocalFiles(acceptedFiles);
    }, [setFiles]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];

            setPreview(URL.createObjectURL(selectedFile));
            setFile(selectedFile);
            setFiles([selectedFile]);

            onFieldChange(selectedFile);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            const selectedFile = droppedFiles[0];

            setPreview(URL.createObjectURL(selectedFile));
            setFile(selectedFile);
            setFiles([selectedFile]);

            onFieldChange(selectedFile);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        setFile(null);
        setFiles([]);
        onFieldChange(null);
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-nx-outline-variant bg-nx-surface-container-low p-6 text-nx-on-surface transition-all hover:border-nx-primary hover:bg-nx-surface-container"
        >
            {preview ? (
                <div className="relative w-full">
                    <Image
                        width={50}
                        height={50}
                        src={preview}
                        alt="Preview"
                        className="max-h-40 w-full rounded-xl object-contain shadow-md"
                    />
                    <button
                        onClick={handleRemove}
                        className="absolute right-2 top-2 rounded-lg bg-nx-error p-1 text-nx-on-error shadow-md transition hover:bg-nx-error/90"
                        title="Remove Image"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <label htmlFor="fileInput" className="group flex cursor-pointer flex-col items-center">
                    <CloudUpload size={50} className="mb-2 text-nx-on-surface-variant transition-colors group-hover:text-nx-primary" />
                    <p className="text-center font-body text-nx-on-surface-variant">
                        Drag & drop files here or{" "}
                        <span className="font-medium text-nx-primary underline">browse</span>
                    </p>
                </label>
            )}
            <input
                id="fileInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default FileUploader;
