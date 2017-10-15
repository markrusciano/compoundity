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
    endOfMonth: number = 1;
    income: number = 0;
    expenses: number = 0;
    returnOnInvestments: number = 0;
    changeInSavings: number = 0;
    savings: number = 0;

    public toTableArray(): Array<number> {
        return [
            this.endOfYear,
            this.endOfMonth,
            this.income,
            this.expenses,
            this.returnOnInvestments,
            this.changeInSavings,
            this.savings
        ];
    }
}

export class FormattedDatum {
    endOfYear: string = '-';
    endOfMonth: string = '-';
    income: string = '-';
    expenses: string = '-';
    returnOnInvestments: string = '-';
    changeInSavings: string = '-';
    savings: string = '-';

    private readonly currencyLocaleOptions: Intl.NumberFormatOptions = {
        maximumFractionDigits: 0
    };

    constructor(rawDatum: CalculatedDatum) {

        this.endOfYear = rawDatum.endOfYear.toString();
        this.endOfMonth = rawDatum.endOfMonth.toString();
        this.income = rawDatum.endOfYear.toLocaleString(
            undefined, this.currencyLocaleOptions);
        this.expenses = rawDatum.expenses.toLocaleString(
            undefined, this.currencyLocaleOptions);
        this.returnOnInvestments = rawDatum.returnOnInvestments.toLocaleString(
            undefined, this.currencyLocaleOptions);
        this.changeInSavings = rawDatum.changeInSavings.toLocaleString(
            undefined, this.currencyLocaleOptions);
        this.savings = rawDatum.savings.toLocaleString(
            undefined, this.currencyLocaleOptions);
    }

    public toTableArray(): Array<string> {
        return [
            this.endOfYear,
            this.endOfMonth,
            this.income,
            this.expenses,
            this.returnOnInvestments,
            this.changeInSavings,
            this.savings
        ];
    }
}