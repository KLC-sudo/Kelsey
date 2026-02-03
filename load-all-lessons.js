// Helper script to load all 5 German A1.1 lessons into localStorage
// Open browser console and paste this entire script

console.log('🚀 Loading German A1.1 Lessons 1-5...');

// Lesson URLs
const lessonUrls = [
    '/lessons/german/A1.1/lesson-01.json',
    '/lessons/german/A1.1/lesson-02.json',
    '/lessons/german/A1.1/lesson-03.json',
    '/lessons/german/A1.1/lesson-04.json',
    '/lessons/german/A1.1/lesson-05.json'
];

// Load all lessons
Promise.all(lessonUrls.map(url => fetch(url).then(r => r.json())))
    .then(lessons => {
        // Store each lesson
        lessons.forEach((lesson, index) => {
            const key = `lesson_${lesson.id}`;
            localStorage.setItem(key, JSON.stringify(lesson));
            console.log(`✅ Loaded Lesson ${index + 1}: ${lesson.topic}`);
        });

        console.log('\n🎉 All 5 lessons loaded successfully!');
        console.log('🔄 Refresh the page to see all lessons in the picker!');
    })
    .catch(error => {
        console.error('❌ Error loading lessons:', error);
        console.log('💡 Make sure you are running the dev server (npm run dev)');
    });
