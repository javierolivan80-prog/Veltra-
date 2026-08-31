"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendFoodMessage, type SendFoodMessageInput } from "@/lib/ai/foodClient";
import type { MealCheckStatus, SavedMeal } from "@/types/models";
import * as repo from "./repo";
import * as waterRepo from "./water";

export const foodKeys = {
  conversations: ["foodConversations"] as const,
  conversation: (id: string) => ["foodConversation", id] as const,
  today: ["foodToday"] as const,
  messages: (conversationId: string) => ["foodMessages", conversationId] as const,
  meals: (conversationId: string) => ["foodMeals", conversationId] as const,
  daily: (date: string) => ["foodDaily", date] as const,
  goals: ["nutritionGoals"] as const,
  saved: ["savedMeals"] as const,
  water: (date: string) => ["water", date] as const,
  mealCheck: (date: string) => ["mealCheck", date] as const,
};

export function useAllFoodMeals() {
  return useQuery({ queryKey: ["allFoodMeals"] as const, queryFn: repo.listAllFoodMeals });
}

export function useWaterLog(date: string) {
  return useQuery({ queryKey: foodKeys.water(date), queryFn: () => waterRepo.getWaterLog(date) });
}

export function useAddWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, delta }: { date: string; delta: number }) => waterRepo.addWater(date, delta),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: foodKeys.water(variables.date) }),
  });
}

export function useMealCheck(date: string) {
  return useQuery({ queryKey: foodKeys.mealCheck(date), queryFn: () => waterRepo.getMealCheck(date) });
}

export function useSetMealCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, status }: { date: string; status: MealCheckStatus }) => waterRepo.setMealCheck(date, status),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: foodKeys.mealCheck(variables.date) }),
  });
}

export function useFoodConversations() {
  return useQuery({ queryKey: foodKeys.conversations, queryFn: repo.listFoodConversations });
}

export function useFoodConversation(id: string | null) {
  return useQuery({ queryKey: foodKeys.conversation(id ?? ""), queryFn: () => repo.getFoodConversation(id!), enabled: !!id });
}

export function useTodayConversation() {
  return useQuery({ queryKey: foodKeys.today, queryFn: repo.getOrCreateTodayConversation });
}

export function useFoodMessages(conversationId: string | null) {
  return useQuery({
    queryKey: foodKeys.messages(conversationId ?? ""),
    queryFn: () => repo.listFoodMessages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useConversationMeals(conversationId: string | null) {
  return useQuery({
    queryKey: foodKeys.meals(conversationId ?? ""),
    queryFn: () => repo.listMealsForConversation(conversationId!),
    enabled: !!conversationId,
  });
}

export function useDailyNutrition(date: string | null) {
  return useQuery({ queryKey: foodKeys.daily(date ?? ""), queryFn: () => repo.getDailyNutrition(date!), enabled: !!date });
}

export function useNutritionGoals() {
  return useQuery({ queryKey: foodKeys.goals, queryFn: repo.getNutritionGoals });
}

export function useUpsertNutritionGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goals: { calories: number; protein: number; carbs: number; fat: number }) => repo.upsertNutritionGoals(goals),
    onSuccess: () => qc.invalidateQueries({ queryKey: foodKeys.goals }),
  });
}

export function useSendFoodMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendFoodMessageInput) => sendFoodMessage(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: foodKeys.messages(variables.conversationId) });
      qc.invalidateQueries({ queryKey: foodKeys.meals(variables.conversationId) });
      qc.invalidateQueries({ queryKey: foodKeys.daily(variables.date) });
      qc.invalidateQueries({ queryKey: foodKeys.conversations });
    },
  });
}

export function useDeleteFoodMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; conversationId: string; date: string }) => repo.deleteFoodMeal(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: foodKeys.meals(variables.conversationId) });
      qc.invalidateQueries({ queryKey: foodKeys.daily(variables.date) });
    },
  });
}

export function useUpdateFoodMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; conversationId: string; date: string; patch: repo.MealPatch }) => repo.updateFoodMeal(id, patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: foodKeys.meals(variables.conversationId) });
      qc.invalidateQueries({ queryKey: foodKeys.daily(variables.date) });
    },
  });
}

export function useSavedMeals() {
  return useQuery({ queryKey: foodKeys.saved, queryFn: repo.listSavedMeals });
}

export function useCreateSavedMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: repo.SavedMealInput) => repo.createSavedMeal(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: foodKeys.saved }),
  });
}

export function useUpdateSavedMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<repo.SavedMealInput> }) => repo.updateSavedMeal(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: foodKeys.saved }),
  });
}

export function useDeleteSavedMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteSavedMeal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: foodKeys.saved }),
  });
}

export function useRegisterSavedMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ saved, conversationId, date }: { saved: SavedMeal; conversationId: string; date: string }) =>
      repo.registerSavedMeal(saved, conversationId, date),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: foodKeys.messages(variables.conversationId) });
      qc.invalidateQueries({ queryKey: foodKeys.meals(variables.conversationId) });
      qc.invalidateQueries({ queryKey: foodKeys.daily(variables.date) });
      qc.invalidateQueries({ queryKey: foodKeys.saved });
    },
  });
}
