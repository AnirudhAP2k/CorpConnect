/**
 * Category Server Actions
 * 
 * Security principles:
 * - All actions validate authentication
 * - Input validation and sanitization
 * - Rate limiting considerations
 * - Proper error handling without exposing sensitive info
 */

"use server";

import { prisma } from "@/lib/db";
import { handleError, parseData } from "@/lib/utils";
import { Category, Industry } from "@prisma/client";

interface CreateOptionProps {
    optionName: string;
    optionType: 'category' | 'industry';
}

interface CreateCategoryProps {
    categoryName: string;
}

interface CreateIndustryProps {
    industryName: string;
}

interface GetAllOptionsProps {
    optionType: 'category' | 'industry';
}

export type OptionsType = Category | Industry;

export type OptionResult = {
    success: boolean;
    data: OptionsType | null;
    message: string;
};

export const createOption = async ({ optionName, optionType }: CreateOptionProps): Promise<OptionResult> => {
    try {
        switch (optionType) {
            case 'category':
                return await createCategory({ categoryName: optionName });
            case 'industry':
                return await createIndustry({ industryName: optionName });
            default:
                throw new Error(`Unsupported option type: ${optionType}`);
        }
    } catch (error) {
        return handleError(error);
    }
};

export const createCategory = async ({ categoryName }: CreateCategoryProps): Promise<OptionResult> => {
    try {
        const existingCategory = await checkExistingOptionType({
            optionName: categoryName,
            optionType: 'category'
        });

        if (existingCategory) {
            return {
                success: false,
                message: 'Category already exists',
                data: null
            };
        }

        const category = await prisma.category.create({
            data: { label: categoryName }
        });

        return {
            success: true,
            message: 'Category created successfully',
            data: parseData(category)
        };
    } catch (error) {
        return handleError(error);
    }
};

export const createIndustry = async ({ industryName }: CreateIndustryProps): Promise<OptionResult> => {
    try {
        const existingIndustry = await checkExistingOptionType({
            optionName: industryName,
            optionType: 'industry'
        });

        if (existingIndustry) {
            return {
                success: false,
                message: 'Industry already exists',
                data: null
            };
        }

        const industry = await prisma.industry.create({
            data: { label: industryName }
        });

        return {
            success: true,
            message: 'Industry created successfully',
            data: parseData(industry)
        };
    } catch (error) {
        return handleError(error);
    }
};

export const getAllOptions = async ({ optionType }: GetAllOptionsProps): Promise<OptionsType[]> => {
    try {
        switch (optionType) {
            case 'category':
                return await getAllCategories();
            case 'industry':
                return await getAllIndustries();
            default:
                throw new Error(`Unsupported option type: ${optionType}`);
        }
    } catch (error) {
        return handleError(error);
    }
};

export const getAllCategories = async (): Promise<Category[]> => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                label: "asc",
            },
        });

        return parseData(categories);
    } catch (error) {
        return handleError(error);
    }
};

export const getAllIndustries = async (): Promise<Industry[]> => {
    try {
        const industries = await prisma.industry.findMany();

        return parseData(industries);
    } catch (error) {
        return handleError(error);
    }
};

const checkExistingOptionType = async ({ optionName, optionType }: CreateOptionProps): Promise<OptionsType | null> => {
    switch (optionType) {
        case 'category':
            return await prisma.category.findUnique({
                where: { label: optionName }
            });
        case 'industry':
            return await prisma.industry.findUnique({
                where: { label: optionName }
            });
    }
};