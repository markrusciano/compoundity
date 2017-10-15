import * as React from 'react';
import DataTable from './components/DataTable';
import ParameterForm from './components/ParameterForm';
import {
  CalculationParameters,
  ParsedCalculationParameters,
  FormattedDatum
} from './model/CalculationInterfaces';
import Calculator from './Calculator';
import { Grid, Row, Col } from 'react-bootstrap';
import './App.css';

export interface AppProps { }
export interface AppState {
  formParams: CalculationParameters;
}

export default class App extends React.Component<AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);
    this.state = {
      formParams: {
        annualIncome: '50000',
        annualSavings: '30000',
        annualExpenses: '20000',
        savingRate: '60',
        portfolioValue: '0',
        annualReturn: '5',
        withdrawalRate: '4'
      }
    };

    this.onParameterChanged = this.onParameterChanged.bind(this);
  }

  render() {
    const parsedParams = new ParsedCalculationParameters(this.state.formParams);
    const tableData = Calculator.calculate(parsedParams, 10);
    const formattedTableData = tableData.map(
      (tableDatum) => new FormattedDatum(tableDatum).toTableArray());

    return (
      <div>
        <Grid>
          <Row>
            <Col xs={6} xsOffset={3}>
              <ParameterForm
                formParameters={this.state.formParams}
                onParameterChanged={this.onParameterChanged}
              />
            </Col>
          </Row>
          <Row>
            <DataTable
              headers={
                [
                  'End of Year',
                  'End of Month',
                  'Income',
                  'Expenses',
                  'Return on Investments',
                  'Change in Savings',
                  'Savings'
                ]
              }

              data={formattedTableData}
            />
          </Row>
        </Grid>
      </div>
    );
  }

  private onParameterChanged(params: CalculationParameters): void {
    console.log('New parameters:', params);
    this.setState({
      formParams: params
    });
  }
}
