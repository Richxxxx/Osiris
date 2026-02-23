const { Usuario, Departamento, Rol } = require('../models');
const notificationService = require('./notificationService');
const { startOfDay, addDays } = require('date-fns');

class EvaluationScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) {
      return;
    }

    // Ejecutar cada hora
    this.intervalId = setInterval(() => {
      this.dailyCheck();
    }, 60 * 60 * 1000);

    // Ejecutar inmediatamente al iniciar
    this.dailyCheck();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async dailyCheck() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    try {
      await this.checkNewEvaluationWindows();
      await this.checkUpcomingDeadlines();
      await this.checkFinalDeadlines();
      await this.checkExpiredWindows();
    } catch (error) {
      console.error('Error en verificación diaria:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async checkNewEvaluationWindows() {
    const today = startOfDay(new Date());
    
    try {
      const employees = await Usuario.findAll({
        where: { estado: 'activo' },
        include: [
          { model: Departamento, as: 'departamento' },
          { model: Rol, as: 'rol' }
        ]
      });

      for (const employee of employees) {
        const evaluationDate = this.getEvaluationDate(employee, today);
        if (!evaluationDate) {
          continue;
        }

        const window = this.getEvaluationWindow(evaluationDate);
        const fiveDaysBefore = addDays(evaluationDate, -5);
        const isReminderDay = startOfDay(today).getTime() === startOfDay(fiveDaysBefore).getTime();
        const isEvaluationDay = startOfDay(today).getTime() === startOfDay(evaluationDate).getTime();
        
        if (isReminderDay) {
          await notificationService.notificarEvaluacionPorVencer(employee.id, 5);
        }
        if (isEvaluationDay) {
          await notificationService.notificarEvaluacionPorVencer(employee.id, 0);
        }
      }
    } catch (error) {
      console.error('Error en checkNewEvaluationWindows:', error);
    }
  }

  async checkUpcomingDeadlines() {
    // Implementación simple
  }

  async checkFinalDeadlines() {
    // Implementación simple
  }

  async checkExpiredWindows() {
    // Implementación simple
  }

  getEvaluationDate(employee, today) {
    if (!employee.fecha_ingreso_empresa) {
      return null;
    }

    const hireDate = new Date(employee.fecha_ingreso_empresa);
    const currentYear = today.getFullYear();
    
    // Evaluación trimestral: cada 3 meses desde la fecha de ingreso
    const monthsWorked = (today.getMonth() - hireDate.getMonth()) + (today.getFullYear() - hireDate.getFullYear()) * 12;
    const quarterNumber = Math.floor(monthsWorked / 3);
    
    if (quarterNumber <= 0) {
      return null;
    }

    const evaluationMonth = (hireDate.getMonth() + quarterNumber * 3) % 12;
    const evaluationYear = hireDate.getFullYear() + Math.floor((hireDate.getMonth() + quarterNumber * 3) / 12);
    
    return new Date(evaluationYear, evaluationMonth, hireDate.getDate());
  }

  getEvaluationWindow(evaluationDate) {
    return {
      start: addDays(evaluationDate, -5),
      end: addDays(evaluationDate, 5)
    };
  }
}

module.exports = new EvaluationScheduler();
