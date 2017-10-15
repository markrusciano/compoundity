export interface CalculationParameters {
    annualIncome: string;
    annualSavings: string;
    annualExpenses: string;
    savingRate: string;
    portfolioValue: string;
    annualReturn: string;
    withdrawalRate: string;
}

export class ParsedCalculationParameters {
    annualIncome: number;
    annualSavings: number;
    annualExpenses: number;
    savingRate: number;
    portfolioValue: number;
    annualReturn: number;
    withdrawalRate: number;

    constructor(rawParams: CalculationParameters) {
        this.annualIncome = parseFloat(rawParams.annualIncome);
        this.annualSavings = parseFloat(rawParams.annualSavings);
        this.annualExpenses = parseFloat(rawParams.annualExpenses);
        this.savingRate = parseFloat(rawParams.savingRate);
        this.portfolioValue = parseFloat(rawParams.portfolioValue);
        this.annualReturn = parseFloat(rawParams.annualReturn);
        this.withdrawalRate = parseFloat(rawParams.withdrawalRate);
    }
}

export class CalculatedDatum {
    endOfYear: number = 0;
    income: number = 0;
    expenses: number = 0;
    returnOnInvestments: number = 0;
    changeInSavings: number = 0;
    savings: number = 0;

    public toTableArray(): Array<number> {
        return [
            this.endOfYear,
            this.income,
            this.expenses,
            this.returnOnInvestments,
            this.changeInSavings,
            this.savings
        ];
    }
}