import React from 'react';
import { AlertTriangle } from "lucide-react";

interface FormErrorsProps {
    message?: string
};

export const FormErrors = ({
    message,
}: FormErrorsProps) => {
    if (!message) {
        return null;
    }

    return (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center text-sm gap-x-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{message}</span>
        </div>
    )
}
