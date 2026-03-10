import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users } from "lucide-react";

interface GroupCardProps {
    group: any;
    joined: boolean;
}

export default function GroupCard({ group, joined }: GroupCardProps) {
    return (
        <Link href={`/groups/${group.id}`} className="block transition-all hover:scale-[1.02]">
            <Card className="h-full flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                {group.logo ? (
                                    <img src={group.logo} alt={group.name} className="w-full h-full object-cover rounded-md" />
                                ) : (
                                    <Building2 className="w-5 h-5 text-primary" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg line-clamp-1">{group.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{group.industry?.label}</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                    <p className="text-sm text-foreground/80 line-clamp-3">
                        {group.description || "No description provided."}
                    </p>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>{group._count?.members || 0} members</span>
                    </div>
                    {joined ? (
                        <Badge variant="secondary" className="font-normal">Joined</Badge>
                    ) : (
                        <Badge variant="outline" className="font-normal border-primary text-primary">Join</Badge>
                    )}
                </CardFooter>
            </Card>
        </Link>
    );
}
