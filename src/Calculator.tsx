import { ParsedCalculationParameters, CalculatedDatum } from './model/CalculationInterfaces';
import InterestUtils from './calculation/interestUtils';

export default class Calculator {
    static calculate(
        params: ParsedCalculationParameters,
        maxYears: number): Array<CalculatedDatum> {

        let data: Array<CalculatedDatum> = [];
        data.push(new CalculatedDatum());

        for (let i = 1; i <= maxYears; i++) {
            const lastMonth = data[data.length - 1];
            const thisYear = Calculator.calculateYear(params, lastMonth);
            console.log(thisYear);
            data = data.concat(thisYear);
        }

        return data;
    }

    public static calculateMonth(
        params: ParsedCalculationParameters,
        lastMonth: CalculatedDatum
    ): CalculatedDatum {
        let thisMonth = new CalculatedDatum();

        if (lastMonth.endOfMonth === 12) {
            thisMonth.endOfYear = lastMonth.endOfYear + 1;
        }

        thisMonth.endOfMonth = (lastMonth.endOfMonth + 1) % 13 || 1;
        thisMonth.income = params.annualIncome / 12;
        thisMonth.expenses = params.annualExpenses / 12;
        thisMonth.returnOnInvestments =
            InterestUtils.compoundContinuously(lastMonth.savings, params.annualReturn / 100, 1);
        thisMonth.changeInSavings = params.annualSavings / 12 + thisMonth.returnOnInvestments;
        thisMonth.savings = lastMonth.savings + thisMonth.savings;

        return thisMonth;
    }

    public static calculateYear(
        params: ParsedCalculationParameters,
        startMonth: CalculatedDatum): Array<CalculatedDatum> {
        let thisYear = new Array<CalculatedDatum>();

        let lastMonth = startMonth;

        for (let i = 1; i < 13; i++) {
            const thisMonth = Calculator.calculateMonth(params, lastMonth);
            thisYear.push(thisMonth);
            lastMonth = thisMonth;
        }

        return thisYear;
    }
}