import type { FlowResult, FlowState } from './types';

export class MealPlanningFlow {
  private state: FlowState;
  
  constructor(sessionId: string) {
    this.state = {
      currentStep: 'zip-validation',
      sessionId,
      data: {},
      errors: [],
      retryCount: 0
    };
  }
  
  getCurrentStep() {
    return this.state.currentStep;
  }
  
  getState() {
    return { ...this.state };
  }
  
  updateData(key: string, value: any) {
    this.state.data[key] = value;
  }
  
  advanceToStep(step: FlowState['currentStep']) {
    this.state.currentStep = step;
  }
  
  addError(error: string) {
    this.state.errors.push(error);
  }
  
  retry() {
    this.state.retryCount += 1;
  }
}