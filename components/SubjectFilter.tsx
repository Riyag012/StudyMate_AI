'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { subjects } from "@/constants";
import { formUrlQuery, removeKeysFromUrlQuery } from "@jsmastery/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const SubjectFilter = () => {
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get('subject') || '';

    const [subject, setSubject] = useState(query);

    useEffect(() => {
        let newUrl = "";
        if(subject === "All") {
            newUrl = removeKeysFromUrlQuery({
                params: searchParams.toString(),
                keysToRemove: ['subject'],
            });
        }
        else {
            newUrl = formUrlQuery({
                params: searchParams.toString(),
                key: 'subject',
                value: subject,
            })
        }

        router.push(newUrl, { scroll: false });
    }, [subject]);

    return (
        <Select onValueChange={setSubject} value = { subject }>
            <SelectTrigger className="input capitalize">
                <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="All">All Subjects</SelectItem>
                {subjects.map((subject) => (
                    <SelectItem key = { subject } value = { subject } className = "capitalize">
                        { subject }
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default SubjectFilter;