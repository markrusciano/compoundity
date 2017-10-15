import * as React from 'react';
import DataTable from './components/DataTable';
import ParameterForm from './components/ParameterForm';
import { CalculationParameters, ParsedCalculationParameters } from './model/CalculationInterfaces';
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
    let tableArray: Array<Array<number>> = [];
    const parsedParams = new ParsedCalculationParameters(this.state.formParams);
    const tableData = Calculator.calculate(parsedParams, 10);

    for (let i = 0; i < tableData.length; i++) {
      tableArray.push(tableData[i].toTableArray());
    }

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
                  'Income',
                  'Expenses',
                  'Return on Investments',
                  'Change in Savings',
                  'Savings'
                ]
              }
              data={tableArray}
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
