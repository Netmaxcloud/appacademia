import jsPDF from 'jspdf';
import { Workout, Diet, UserProfile } from '../types';

export const exportWorkoutPDF = (workout: Workout, client: UserProfile) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('IA TRAINER', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Treino Personalizado', 105, 30, { align: 'center' });
  
  // Client Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(`Cliente: ${client.full_name}`, 20, 50);
  doc.text(`Objetivo: ${client.objective}`, 20, 60);
  doc.text(`Data: ${new Date().toLocaleDateString()}`, 150, 50);
  
  // Workout Info
  doc.setFontSize(18);
  doc.setTextColor(239, 68, 68); // Primary Red
  doc.text((workout.workout_name || workout.name || '').toUpperCase(), 105, 80, { align: 'center' });
  
  // Exercises Table
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  let y = 100;
  
  workout.exercises.forEach((ex, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${ex.name}`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${ex.sets} séries x ${ex.reps} reps | Descanso: ${ex.rest_time}`, 20, y + 7);
    if (ex.weight) doc.text(`Carga: ${ex.weight}`, 150, y + 7);
    
    y += 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y - 5, 190, y - 5);
  });
  
  doc.save(`treino_${client.full_name?.replace(' ', '_')}.pdf`);
};
