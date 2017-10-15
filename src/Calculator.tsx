import { ParsedCalculationParameters, CalculatedDatum } from './model/CalculationInterfaces';

export default class Calculator {
    static calculate(params: ParsedCalculationParameters, maxYears: number): Array<CalculatedDatum> {
        let data: Array<CalculatedDatum> = [];
        data.push(new CalculatedDatum());

        for (let i = 1; i <= maxYears; i++) {
            const lastYear = data[i - 1];
            let thisYear = new CalculatedDatum();

            thisYear.endOfYear = i;
            thisYear.income = params.annualIncome;
            thisYear.expenses = params.annualExpenses;
            thisYear.returnOnInvestments = params.annualReturn;

            const interest = lastYear.savings * params.annualReturn / 100;
            thisYear.changeInSavings = params.annualSavings + interest;
            thisYear.savings = lastYear.savings + thisYear.changeInSavings;

            data.push(thisYear);
        }

        return data;
    }
}