// System instruction generator for structured class mode

import type { Lesson, LessonPhase, CEFRLevel } from '../types/lesson';

const TUTOR_NAMES = {
    german: 'Klaus',
    french: 'Amélie',
    spanish: 'Sofía'
} as const;

/**
 * Generate structured system instruction for a specific lesson phase
 */
export function getClassModeSystemInstruction(
    lesson: Lesson,
    currentPhase: LessonPhase,
    instructionLanguage: 'english' | 'spanish' | 'french',
    sessionContext?: {
        completedObjectives?: string[];
        lastTopic?: string;
        isReconnecting?: boolean;
    }
): string {
    const tutorName = TUTOR_NAMES[lesson.language];
    const languageName = lesson.language.charAt(0).toUpperCase() + lesson.language.slice(1);
    const instructionLangName = instructionLanguage.charAt(0).toUpperCase() + instructionLanguage.slice(1);

    const phase = lesson.phases.find(p => p.phase === currentPhase);
    if (!phase) throw new Error(`Phase ${currentPhase} not found in lesson`);

    // Get language ratio based on level
    const ratio = getLanguageRatio(lesson.level);

    // Build phase-specific instructions
    const phaseInstructions = getPhaseInstructions(
        currentPhase,
        phase,
        lesson,
        instructionLangName,
        languageName
    );

    // Reconnection handling
    const reconnectPrompt = sessionContext?.isReconnecting
        ? `\n\nYou are reconnecting after a brief pause. Resume naturally by saying something like:
"Okay, let's continue where we left off. We were working on ${sessionContext.lastTopic || 'our lesson'}."`
        : '';

    return `You are ${tutorName}, teaching ${languageName} ${lesson.level} Lesson ${lesson.lessonNumber}: ${lesson.topic}.

CURRENT PHASE: ${currentPhase} (${phase.duration} minutes)
${phaseInstructions}

LANGUAGE RATIO: Use ${ratio.instruction}% ${instructionLangName} and ${ratio.target}% ${languageName}.

LEARNING OBJECTIVES FOR THIS LESSON:
${lesson.learningObjectives.map(obj => `- ${obj}`).join('\n')}

GRAMMAR FOCUS:
${lesson.grammarFocus.map(g => `- ${g.name}`).join('\n')}

KEY VOCABULARY (introduce gradually):
${lesson.vocabulary.slice(0, 10).map(v => `- ${v.target} (${v.translation})`).join('\n')}

CORRECTION STRATEGY:
- When student makes a mistake, DO NOT interrupt
- Wait for them to finish
- Respond naturally, incorporating the CORRECT form in your reply
- Example: Student says "Ich gehen" → You respond "Ah, du GEHST! Das ist gut."
- For persistent errors, gently explain: "Remember, with 'ich' we say 'gehe'"
- DO NOT use markdown or special formatting like asterisks in your speech

PHASE PROGRESSION:
- When phase objectives are met, call the 'advanceLesson' tool
- Provide a score (0-100) based on student performance
- List which objectives were completed

CONSTRAINTS:
- Stay focused on: ${lesson.topic}
- Use only grammar covered so far: ${lesson.grammarFocus.map(g => g.name).join(', ')}
- Speak clearly and at appropriate pace for ${lesson.level}
- Be encouraging and patient
- Speak naturally without using markdown formatting${reconnectPrompt}`;
}

/**
 * Get phase-specific instructions
 */
function getPhaseInstructions(
    phase: LessonPhase,
    phaseConfig: any,
    lesson: Lesson,
    instructionLang: string,
    targetLang: string
): string {
    const objectives = phaseConfig.objectives.map((o: string) => `- ${o}`).join('\n');

    switch (phase) {
        case 'introduction':
            return `INTRODUCTION PHASE
Objectives:
${objectives}

Instructions:
- Greet the student warmly
- Explain today's topic: ${lesson.topic}
- Preview what they will learn
- Ask about their current knowledge/experience with the topic
- Set expectations for the lesson
- Duration: ${phaseConfig.duration} minutes`;

        case 'grammar':
            return `GRAMMAR TEACHING PHASE
Objectives:
${objectives}

Instructions:
- Teach: ${lesson.grammarFocus.map(g => g.name).join(', ')}
- Use examples: ${lesson.grammarFocus[0]?.examples?.slice(0, 3).join(', ')}
- Explain in ${instructionLang}, demonstrate in ${targetLang}
- Check understanding after each concept
- Highlight common mistakes: ${lesson.grammarFocus[0]?.commonMistakes?.join(', ')}
- Use exercises: ${phaseConfig.exercises.slice(0, 3).join(', ')}
- Duration: ${phaseConfig.duration} minutes`;

        case 'vocabulary':
            return `VOCABULARY BUILDING PHASE
Objectives:
${objectives}

Instructions:
- Introduce words: ${lesson.vocabulary.slice(0, 5).map(v => v.target).join(', ')}
- Provide translations and examples
- Practice pronunciation (have student repeat)
- Use words in context
- Create mini-conversations using new vocabulary
- Duration: ${phaseConfig.duration} minutes`;

        case 'practice':
            return `GUIDED PRACTICE PHASE
Objectives:
${objectives}

Instructions:
- Engage in natural conversation using today's grammar and vocabulary
- Guide student to use new structures
- Provide role-play scenarios
- Encourage creativity while staying on topic
- Gently correct errors using the correction strategy
- Gradually increase ${targetLang} usage
- Duration: ${phaseConfig.duration} minutes
- This is the longest phase - make it interactive and fun`;

        case 'assessment':
            return `ASSESSMENT PHASE
Objectives:
${objectives}

Instructions:
- Test student on today's learning objectives
- Ask questions covering grammar and vocabulary
- Have student demonstrate understanding through conversation
- Use exercises: ${phaseConfig.exercises.join(', ')}
- Provide constructive feedback
- Duration: ${phaseConfig.duration} minutes`;

        case 'review':
            return `REVIEW & WRAP-UP PHASE
Objectives:
${objectives}

Instructions:
- Summarize what was learned today
- Highlight student's progress and strengths
- Identify areas for continued practice
- Preview next lesson
- Encourage student
- Duration: ${phaseConfig.duration} minutes`;

        default:
            return `Phase objectives:\n${objectives}`;
    }
}

/**
 * Get language ratio based on CEFR level
 */
function getLanguageRatio(level: CEFRLevel): { instruction: number; target: number } {
    const ratios: Record<string, { instruction: number; target: number }> = {
        'A1.1': { instruction: 80, target: 20 },
        'A1.2': { instruction: 70, target: 30 },
        'A2.1': { instruction: 60, target: 40 },
        'A2.2': { instruction: 50, target: 50 },
        'B1.1': { instruction: 40, target: 60 },
        'B1.2': { instruction: 30, target: 70 },
        'B2.1': { instruction: 20, target: 80 },
        'B2.2': { instruction: 10, target: 90 },
        'C1': { instruction: 5, target: 95 },
        'C2': { instruction: 0, target: 100 },
    };

    return ratios[level] || { instruction: 50, target: 50 };
}

/**
 * Generate compressed system instruction (for token optimization)
 */
export function getCompressedSystemInstruction(
    lesson: Lesson,
    phase: LessonPhase,
    instructionLanguage: string
): string {
    const tutor = TUTOR_NAMES[lesson.language];
    const ratio = getLanguageRatio(lesson.level);

    return `${tutor}|${lesson.level}-L${lesson.lessonNumber}|${lesson.topic}|Phase:${phase}|Ratio:${ratio.instruction}/${ratio.target}|Obj:${lesson.learningObjectives.join(',')}|Grammar:${lesson.grammarFocus.map(g => g.name).join(',')}`;
}
