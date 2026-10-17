
'use server';

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("You must be signed in to create a companion.");
    }

    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
        .from("companions")
        .insert({ ...formData, author: userId })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const getAllComapnions = async ({
    limit = 10,
    page = 1,
    subject,
    topic,
}: GetAllCompanions) => {
    const supabase = await createSupabaseClient();

    let query = supabase
        .from("companions")
        .select("*")
        .order("created_at", { ascending: false });

    if (subject) {
        const subjects = Array.isArray(subject) ? subject : [subject];
        query = query.in("subject", subjects);
    }

    if (topic) {
        const topics = Array.isArray(topic) ? topic : [topic];
        const topicFilters = topics
            .map((value) => value.replace(/[%_,]/g, " ").trim())
            .filter(Boolean);

        if (topicFilters.length > 0) {
            query = query.or(
                topicFilters
                    .map((value) => `topic.ilike.%${value}%,name.ilike.%${value}%`)
                    .join(",")
            );
        }
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error } = await query.range(start, end);

    if (error) {
        throw new Error(error.message);
    }

    return data ?? [];
};

export const getCompanion = async (id: string) => {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
        .from("companions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const addToSessionHistory = async (companionId: string) => {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("You must be signed in to start a session.");
    }

    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
        .from("session_history")
        .insert({
            companion_id: companionId,
            user_id: userId,
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const getRecentSessions = async (limit = 10) => {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
        .from("session_history")
        .select("companions:companion_id(*)")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? [])
        .map((session) => session.companions)
        .filter(Boolean);
};

export const getUserSessions = async (
    userId: string,
    limit = 10
) => {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
        .from("session_history")
        .select("companions:companion_id(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? [])
        .map((session) => session.companions)
        .filter(Boolean);
};

export const getUserCompanions = async (userId: string) => {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
        .from("companions")
        .select("*")
        .eq("author", userId)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data ?? [];
};

export const newCompanionPermissions = async () => {
    const { userId, has } = await auth();

    if (!userId) {
        return false;
    }

    if (has({ plan: "pro" })) {
        return true;
    }

    // Allow three companions by default for the free tier.
    let limit = 3;

    if (has({ feature: "10_companion_limit" })) {
        limit = 10;
    } else if (has({ feature: "3_companion_limit" })) {
        limit = 3;
    }

    const supabase = await createSupabaseClient();

    const { count, error } = await supabase
        .from("companions")
        .select("id", { count: "exact", head: true })
        .eq("author", userId);

    if (error) {
        throw new Error(error.message);
    }

    return (count ?? 0) < limit;
};
