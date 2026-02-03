// PDF Export Utility for Whiteboard Notes
import { jsPDF } from 'jspdf';

interface Note {
    category: string;
    term: string;
    translation?: string;
    explanation: string;
}

export function exportNotesToPDF(
    notes: Note[],
    lessonInfo: {
        topic: string;
        language: string;
        level: string;
        date: string;
    }
) {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Language Learning Notes', 20, 20);

    // Lesson Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Topic: ${lessonInfo.topic}`, 20, 35);
    doc.text(`Language: ${lessonInfo.language}`, 20, 42);
    doc.text(`Level: ${lessonInfo.level}`, 20, 49);
    doc.text(`Date: ${lessonInfo.date}`, 20, 56);

    // Separator
    doc.setLineWidth(0.5);
    doc.line(20, 62, 190, 62);

    let yPosition = 72;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // Group notes by category
    const categorized: Record<string, Note[]> = {};
    notes.forEach(note => {
        if (!categorized[note.category]) {
            categorized[note.category] = [];
        }
        categorized[note.category].push(note);
    });

    // Category icons and labels
    const categoryLabels: Record<string, string> = {
        vocabulary: '📚 Vocabulary',
        grammar: '🔤 Grammar',
        phrase: '💡 Phrases',
        context: 'ℹ️ Context',
        cultural: '🌍 Cultural Notes'
    };

    // Render each category
    Object.entries(categorized).forEach(([category, categoryNotes]) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
        }

        // Category header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(categoryLabels[category] || category, margin, yPosition);
        yPosition += lineHeight + 3;

        // Category notes
        doc.setFontSize(10);
        categoryNotes.forEach((note, index) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 30) {
                doc.addPage();
                yPosition = 20;
            }

            // Term
            if (note.term) {
                doc.setFont('helvetica', 'bold');
                doc.text(`${index + 1}. ${note.term}`, margin + 5, yPosition);
                yPosition += lineHeight;
            }

            // Translation
            if (note.translation) {
                doc.setFont('helvetica', 'italic');
                doc.text(`   → ${note.translation}`, margin + 5, yPosition);
                yPosition += lineHeight;
            }

            // Explanation
            doc.setFont('helvetica', 'normal');
            const explanationLines = doc.splitTextToSize(note.explanation, 160);
            explanationLines.forEach((line: string) => {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(`   ${line}`, margin + 5, yPosition);
                yPosition += lineHeight;
            });

            yPosition += 3; // Space between notes
        });

        yPosition += 5; // Space between categories
    });

    // Footer on last page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Page ${i} of ${totalPages}`,
            doc.internal.pageSize.width / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    // Generate filename
    const filename = `${lessonInfo.language}_${lessonInfo.level}_${lessonInfo.topic.replace(/\s+/g, '_')}_${lessonInfo.date}.pdf`;

    // Save
    doc.save(filename);
}

// Simpler version for quick export
export function quickExportNotes(notes: string[], topic: string = 'Lesson') {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(topic, 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let yPosition = 35;
    const pageHeight = doc.internal.pageSize.height;

    notes.forEach((note, index) => {
        if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
        }

        const lines = doc.splitTextToSize(`${index + 1}. ${note}`, 170);
        lines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(line, 20, yPosition);
            yPosition += 7;
        });

        yPosition += 3;
    });

    const date = new Date().toISOString().split('T')[0];
    doc.save(`notes_${date}.pdf`);
}
