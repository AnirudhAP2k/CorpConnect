import React, { startTransition, useEffect, useState } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '../ui/input';
import { createOption, getAllOptions } from '@/actions/category.actions';
import { OptionsTypes } from '@/constants';

interface DropdownProps {
    value: string
    onChangeHandler?: () => void
    type?: 'category' | 'industry'
    disabled?: boolean
}

const Dropdown = ({ value, onChangeHandler, type, disabled }: DropdownProps) => {
    const [options, setOptions] = useState<OptionsTypes[]>([]);
    const [newOption, setNewOption] = useState('');

    const handleAddOption = async () => {
        await createOption({
            optionName: newOption.trim(),
            optionType: type || 'category'
        })
            .then((option) => {
                setOptions((prevSate) => [...prevSate, option]);
            })
    }

    useEffect(() => {
        const getOptions = async () => {
            const optionList = await getAllOptions({ optionType: type || 'category' });

            optionList && setOptions(optionList as OptionsTypes[]);
        }

        getOptions();
    }, []);

    return (
        <Select onValueChange={onChangeHandler} defaultValue={value} disabled={disabled}>
            <SelectTrigger className="select-field">
                <SelectValue placeholder={`${type || 'category'}`} />
            </SelectTrigger>
            <SelectContent>
                {options.length > 0 && options.map((option) => (
                    <SelectItem
                        key={option.id}
                        value={option.id}
                        className="select-item p-regular-14"
                    >
                        {option.label}
                    </SelectItem>

                ))}

                <AlertDialog>
                    <AlertDialogTrigger className="p-medium-14 flex w-full rounded-sm py-3 pl-8 text-primary-500 hover:bg-primary-50 focus:text-primary-500">Add new {type || 'category'}</AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>New {type || 'category'}</AlertDialogTitle>
                            <AlertDialogDescription>
                                <Input type="text" placeholder={`${type || 'category'} name`} className="input-field mt-3" onChange={(e) => { setNewOption(e.target.value) }} />
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { startTransition(handleAddOption) }}>Add</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SelectContent>
        </Select>
    )
}

export default Dropdown
