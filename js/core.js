/* Elica — registro dei contenuti.
   Ogni file in content/ chiama ELICA.addCourse({...}). */
window.ELICA = {
  courses: [],
  addCourse(c) { this.courses.push(c); }
};
