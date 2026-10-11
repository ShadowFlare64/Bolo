import type { Lesson, LearningText } from "../lib/types";
const how: LearningText = { romanized: "Kem cho?", gujarati: "કેમ છો?", english: "How are you?" };
const well: LearningText = { romanized: "Hu majama chhu.", gujarati: "હું મજામાં છું.", english: "I am well." };
const thanks: LearningText = { romanized: "Aabhar", gujarati: "આભાર", english: "Thank you" };
const base = { difficulty: "beginner" as const, concepts: ["greetings"] };
export const introLesson: Lesson = {
  id: "first-conversation", title: "Your first conversation", durationMinutes: 4,
  description: "Ask how someone is, share how you feel, and say thank you.",
  reviewStatus: "needs-native-review",
  sources: [{ label: "Baraha Gujarati examples", url: "https://www.baraha.com/help/Keyboards/guj-examples.htm" }],
  phrases: [how, well, thanks],
  exercises: [
    { ...base, id: "recognize-question", type: "multiple-choice", prompt: 'How do you ask “How are you?”', options: [{ id: "thanks", text: thanks }, { id: "how", text: how }, { id: "well", text: well }], correctOptionId: "how", explanation: '“Kem cho?” means “How are you?”' },
    { ...base, id: "recognize-response", type: "multiple-choice", prompt: 'Someone asks “Kem cho?” Choose “I am well.”', options: [{ id: "well", text: well }, { id: "thanks", text: thanks }, { id: "how", text: how }], correctOptionId: "well", explanation: '“Hu majama chhu” means “I am well.”' },
    { ...base, id: "build-question", type: "sentence-arrangement", prompt: 'Build the question: “How are you?”', tokens: [{ id: "cho", text: { romanized: "cho?", gujarati: "છો?", english: "" } }, { id: "kem", text: { romanized: "Kem", gujarati: "કેમ", english: "" } }], acceptedOrders: [["kem", "cho"]], explanation: 'The question is “Kem cho?” — “How are you?”' },
    { ...base, id: "recognize-thanks", type: "multiple-choice", prompt: 'How do you say “Thank you”?', options: [{ id: "how", text: how }, { id: "well", text: well }, { id: "thanks", text: thanks }], correctOptionId: "thanks", explanation: '“Aabhar” means “Thank you.”' },
    { ...base, id: "build-response", type: "sentence-arrangement", prompt: 'Build the response: “I am well.”', tokens: [{ id: "chhu", text: { romanized: "chhu.", gujarati: "છું.", english: "" } }, { id: "hu", text: { romanized: "Hu", gujarati: "હું", english: "" } }, { id: "majama", text: { romanized: "majama", gujarati: "મજામાં", english: "" } }], acceptedOrders: [["hu", "majama", "chhu"]], explanation: 'The response is “Hu majama chhu.” — “I am well.”' }
  ]
};
