import React from 'react';
import { CheckCircle2 } from "lucide-react";

interface FormSuccessProps {
    message?: string
};

export const FormSuccess = ({
    message,
}: FormSuccessProps) => {
    if (!message) {
        return null;
    }

    return (
        <div className="bg-emerald-500/15 p-3 rounded-md flex items-center text-sm gap-x-2 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            <span>{message}</span>
        </div>
    )
}
