"use server";

import { uploadFileAction as domainUploadAction } from "@/domain/file-uploads";
import type { UploadResult } from "@/lib/types";

export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
    return domainUploadAction(formData);
}
