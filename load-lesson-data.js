// Helper script to load lesson data into localStorage
// Open browser console and paste this entire script

console.log('📚 Loading German A1.1 Lesson 1 into localStorage...');

const lesson = {
    "id": "german-A1.1-lesson-01",
    "language": "german",
    "level": "A1.1",
    "lessonNumber": 1,
    "topic": "Alphabet, Phonetics & Greetings",
    "grammarFocus": [
        {
            "name": "Verb 'sein' (to be)",
            "explanation": "The verb 'sein' is irregular and means 'to be'. It's one of the most important verbs in German.",
            "examples": [
                "Ich bin Klaus (I am Klaus)",
                "Du bist Student (You are a student)",
                "Er/Sie ist hier (He/She is here)"
            ],
            "commonMistakes": [
                "Using 'bin' for all persons (should be: bin, bist, ist)",
                "Forgetting the verb in simple sentences"
            ]
        },
        {
            "name": "Personal Pronouns",
            "explanation": "Personal pronouns replace names and identify who is doing the action.",
            "examples": [
                "ich (I)",
                "du (you - informal)",
                "er/sie/es (he/she/it)"
            ],
            "commonMistakes": [
                "Using 'Sie' (formal you) when 'du' is appropriate",
                "Confusing 'sie' (she) with 'Sie' (formal you)"
            ]
        }
    ],
    "vocabulary": [
        { "target": "Hallo", "translation": "Hello", "partOfSpeech": "interjection", "example": "Hallo! Wie geht's?", "exampleTranslation": "Hello! How are you?" },
        { "target": "Guten Morgen", "translation": "Good morning", "partOfSpeech": "phrase", "example": "Guten Morgen, Klaus!", "exampleTranslation": "Good morning, Klaus!" },
        { "target": "Guten Tag", "translation": "Good day/Hello", "partOfSpeech": "phrase", "example": "Guten Tag! Wie heißen Sie?", "exampleTranslation": "Good day! What is your name?" },
        { "target": "Danke", "translation": "Thank you", "partOfSpeech": "interjection", "example": "Danke schön!", "exampleTranslation": "Thank you very much!" },
        { "target": "Bitte", "translation": "Please/You're welcome", "partOfSpeech": "interjection", "example": "Bitte sehr!", "exampleTranslation": "You're very welcome!" },
        { "target": "Ja", "translation": "Yes", "partOfSpeech": "adverb", "example": "Ja, ich bin Student.", "exampleTranslation": "Yes, I am a student." },
        { "target": "Nein", "translation": "No", "partOfSpeech": "adverb", "example": "Nein, ich bin nicht Klaus.", "exampleTranslation": "No, I am not Klaus." },
        { "target": "Ich", "translation": "I", "partOfSpeech": "pronoun", "example": "Ich bin Maria.", "exampleTranslation": "I am Maria." },
        { "target": "Du", "translation": "You (informal)", "partOfSpeech": "pronoun", "example": "Du bist nett.", "exampleTranslation": "You are nice." },
        { "target": "Wie heißt du?", "translation": "What is your name? (informal)", "partOfSpeech": "phrase", "example": "Hallo! Wie heißt du?", "exampleTranslation": "Hello! What is your name?" }
    ],
    "exercises": [
        {
            "id": "german-A1.1-lesson-01-ex-01",
            "type": "dialog",
            "phase": "introduction",
            "prompt": "Greet the student and ask their name in German",
            "hints": ["Use 'Guten Tag' or 'Hallo'", "Ask 'Wie heißt du?'"],
            "duration": 120
        },
        {
            "id": "german-A1.1-lesson-01-ex-02",
            "type": "vocabulary",
            "phase": "vocabulary",
            "prompt": "Practice greetings: Have student say 'Guten Morgen', 'Guten Tag', and 'Guten Abend'",
            "hints": ["Repeat each phrase 3 times", "Explain when to use each greeting"],
            "duration": 180
        },
        {
            "id": "german-A1.1-lesson-01-ex-03",
            "type": "grammar-drill",
            "phase": "grammar",
            "prompt": "Practice 'sein' conjugation: ich bin, du bist, er/sie ist",
            "hints": ["Have student repeat each form", "Create simple sentences"],
            "duration": 240
        }
    ],
    "totalDuration": 300,
    "phases": [
        {
            "phase": "introduction",
            "duration": 15,
            "objectives": ["Understand lesson goals", "Get comfortable with German sounds"],
            "exercises": ["german-A1.1-lesson-01-ex-01"]
        },
        {
            "phase": "grammar",
            "duration": 60,
            "objectives": ["Learn verb 'sein'", "Understand personal pronouns"],
            "exercises": ["german-A1.1-lesson-01-ex-03"]
        },
        {
            "phase": "vocabulary",
            "duration": 45,
            "objectives": ["Learn basic greetings", "Practice pronunciation"],
            "exercises": ["german-A1.1-lesson-01-ex-02"]
        },
        {
            "phase": "practice",
            "duration": 120,
            "objectives": ["Use greetings in context", "Build confidence speaking"],
            "exercises": []
        },
        {
            "phase": "assessment",
            "duration": 40,
            "objectives": ["Demonstrate understanding", "Identify areas for review"],
            "exercises": []
        },
        {
            "phase": "review",
            "duration": 20,
            "objectives": ["Summarize learning", "Preview next lesson"],
            "exercises": []
        }
    ],
    "learningObjectives": [
        "Greet people in German using appropriate phrases",
        "Introduce yourself with your name",
        "Use the verb 'sein' (to be) correctly",
        "Understand and use basic personal pronouns (ich, du, er, sie)"
    ],
    "prerequisites": [],
    "generatedAt": "2026-01-30T15:30:00.000Z",
    "generatedBy": "manual",
    "reviewed": true,
    "reviewedBy": "curriculum-designer"
};

// Save to localStorage
localStorage.setItem('lesson_german-A1.1-lesson-01', JSON.stringify(lesson));

console.log('✅ Lesson loaded successfully!');
console.log('📋 Lesson ID:', lesson.id);
console.log('📚 Topic:', lesson.topic);
console.log('📝 Vocabulary items:', lesson.vocabulary.length);
console.log('🎯 Learning objectives:', lesson.learningObjectives.length);
console.log('\n🔄 Refresh the page to see the changes!');
