import { db } from "@workspace/db";
import { topicsTable, questionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const TOPIC_TITLE = "Islamic Basics";

const MCQ_QUESTIONS = [
  {
    question: "How many pillars of Islam are there?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "5",
  },
  {
    question: "What is the first pillar of Islam?",
    options: ["Salah (Prayer)", "Shahada (Declaration of Faith)", "Zakat (Charity)", "Sawm (Fasting)"],
    correctAnswer: "Shahada (Declaration of Faith)",
  },
  {
    question: "How many times a day do Muslims pray?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "5",
  },
  {
    question: "What is the holy book of Islam?",
    options: ["Torah", "Bible", "Quran", "Zabur"],
    correctAnswer: "Quran",
  },
  {
    question: "How many pillars of Iman (faith) are there?",
    options: ["4", "5", "6", "7"],
    correctAnswer: "6",
  },
  {
    question: "Who is the last Prophet of Islam?",
    options: ["Isa (AS)", "Ibrahim (AS)", "Musa (AS)", "Muhammad (SAW)"],
    correctAnswer: "Muhammad (SAW)",
  },
  {
    question: "What does 'Salah' mean?",
    options: ["Fasting", "Prayer", "Charity", "Pilgrimage"],
    correctAnswer: "Prayer",
  },
  {
    question: "What is 'Zakat'?",
    options: ["Pilgrimage to Makkah", "Obligatory annual charity", "Daily prayer", "Month of fasting"],
    correctAnswer: "Obligatory annual charity",
  },
  {
    question: "In which month do Muslims fast?",
    options: ["Shawwal", "Ramadan", "Dhul Hijjah", "Muharram"],
    correctAnswer: "Ramadan",
  },
  {
    question: "What is 'Hajj'?",
    options: ["Daily prayer", "Annual charity", "Pilgrimage to Makkah", "Month of fasting"],
    correctAnswer: "Pilgrimage to Makkah",
  },
  {
    question: "How many Surahs (chapters) are in the Quran?",
    options: ["100", "110", "114", "120"],
    correctAnswer: "114",
  },
  {
    question: "What is the first Surah of the Quran?",
    options: ["Al-Baqarah", "Al-Fatiha", "Al-Ikhlas", "Al-Nas"],
    correctAnswer: "Al-Fatiha",
  },
  {
    question: "What is the longest Surah in the Quran?",
    options: ["Al-Imran", "Al-Fatiha", "Al-Baqarah", "An-Nisa"],
    correctAnswer: "Al-Baqarah",
  },
  {
    question: "What language was the Quran revealed in?",
    options: ["Urdu", "Arabic", "Persian", "Hebrew"],
    correctAnswer: "Arabic",
  },
  {
    question: "Who was the first prophet in Islam?",
    options: ["Ibrahim (AS)", "Musa (AS)", "Adam (AS)", "Nuh (AS)"],
    correctAnswer: "Adam (AS)",
  },
  {
    question: "What is the Shahada?",
    options: ["Declaration of faith", "Daily prayer", "Fasting", "Pilgrimage"],
    correctAnswer: "Declaration of faith",
  },
  {
    question: "How many Juz (parts) is the Quran divided into?",
    options: ["10", "20", "30", "40"],
    correctAnswer: "30",
  },
  {
    question: "What is 'Wudu'?",
    options: ["Islamic prayer", "Ritual purification before prayer", "Islamic fasting", "Charity"],
    correctAnswer: "Ritual purification before prayer",
  },
  {
    question: "What direction do Muslims face when praying?",
    options: ["North", "South", "East towards Jerusalem", "Qibla (towards Kaaba in Makkah)"],
    correctAnswer: "Qibla (towards Kaaba in Makkah)",
  },
  {
    question: "What does 'Bismillah' mean?",
    options: ["Praise be to Allah", "In the name of Allah", "Allah is great", "Glory be to Allah"],
    correctAnswer: "In the name of Allah",
  },
  {
    question: "How many Rakat (units) are in the Fajr prayer?",
    options: ["2", "3", "4", "6"],
    correctAnswer: "2",
  },
  {
    question: "What does 'Alhamdulillah' mean?",
    options: ["Allah is great", "In the name of Allah", "All praise is due to Allah", "Glory be to Allah"],
    correctAnswer: "All praise is due to Allah",
  },
  {
    question: "Who built the Kaaba?",
    options: ["Muhammad (SAW)", "Musa (AS)", "Ibrahim (AS) and Ismail (AS)", "Adam (AS)"],
    correctAnswer: "Ibrahim (AS) and Ismail (AS)",
  },
  {
    question: "What is 'Iman'?",
    options: ["Fasting", "Prayer", "Faith and belief", "Charity"],
    correctAnswer: "Faith and belief",
  },
  {
    question: "How many Rakat are in Dhuhr prayer?",
    options: ["2", "3", "4", "5"],
    correctAnswer: "4",
  },
  {
    question: "What is the Islamic month of pilgrimage?",
    options: ["Muharram", "Ramadan", "Dhul Hijjah", "Shawwal"],
    correctAnswer: "Dhul Hijjah",
  },
  {
    question: "What does 'SubhanAllah' mean?",
    options: ["All praise is due to Allah", "Allah is great", "Glory be to Allah", "In the name of Allah"],
    correctAnswer: "Glory be to Allah",
  },
  {
    question: "What is the Azan?",
    options: ["A supplication", "The call to prayer", "A type of prayer", "A pillar of Islam"],
    correctAnswer: "The call to prayer",
  },
  {
    question: "In Islam, how many angels are assigned to each person?",
    options: ["1", "2", "4", "10"],
    correctAnswer: "2",
  },
  {
    question: "What does 'Allahu Akbar' mean?",
    options: ["Praise be to Allah", "In the name of Allah", "Allah is the Greatest", "Glory be to Allah"],
    correctAnswer: "Allah is the Greatest",
  },
];

const TRUE_FALSE_QUESTIONS = [
  { question: "Muslims pray 3 times a day.", correctAnswer: "False" },
  { question: "The Quran was revealed to Prophet Muhammad (SAW).", correctAnswer: "True" },
  { question: "Ramadan is the 10th month of the Islamic calendar.", correctAnswer: "False" },
  { question: "Hajj must be performed at least once in a lifetime if one is able.", correctAnswer: "True" },
  { question: "Zakat is approximately 2.5% of eligible savings.", correctAnswer: "True" },
  { question: "Al-Fatiha is the last Surah of the Quran.", correctAnswer: "False" },
  { question: "Prophet Isa (AS) is recognised as a prophet in Islam.", correctAnswer: "True" },
  { question: "Juma (Friday prayer) is obligatory for Muslim men.", correctAnswer: "True" },
  { question: "The Quran has 115 Surahs.", correctAnswer: "False" },
  { question: "Angels are one of the six pillars of Iman.", correctAnswer: "True" },
];

export async function seedQuestions(log?: (msg: string) => void) {
  const info = log ?? console.log;
  try {
    // Upsert the "Islamic Basics" topic
    let topic = await db
      .select()
      .from(topicsTable)
      .where(eq(topicsTable.title, TOPIC_TITLE))
      .limit(1);

    let topicId: number;
    if (topic.length === 0) {
      const [created] = await db
        .insert(topicsTable)
        .values({ title: TOPIC_TITLE, content: "Core questions about Islamic knowledge and practices." })
        .returning();
      topicId = created.id;
      info(`Seed: created topic "${TOPIC_TITLE}" (id=${topicId})`);
    } else {
      topicId = topic[0].id;
    }

    // Count existing questions for this topic
    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(questionsTable)
      .where(eq(questionsTable.topicId, topicId));

    if (Number(existingCount) >= 10) {
      info(`Seed: topic "${TOPIC_TITLE}" already has ${existingCount} questions — skipping.`);
      return;
    }

    // Insert MCQ questions
    for (const q of MCQ_QUESTIONS) {
      await db.insert(questionsTable).values({
        topicId,
        question: q.question,
        questionType: "mcq",
        options: q.options,
        correctAnswer: q.correctAnswer,
      });
    }

    // Insert True/False questions
    for (const q of TRUE_FALSE_QUESTIONS) {
      await db.insert(questionsTable).values({
        topicId,
        question: q.question,
        questionType: "true_false",
        options: ["True", "False"],
        correctAnswer: q.correctAnswer,
      });
    }

    info(`Seed: inserted ${MCQ_QUESTIONS.length + TRUE_FALSE_QUESTIONS.length} questions for "${TOPIC_TITLE}".`);
  } catch (err) {
    console.error("Seed error:", err);
  }
}
