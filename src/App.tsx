import * as React from 'react';
import DataTable from './components/DataTable';
import ParameterForm from './components/ParameterForm';
import CalculationParameters from './model/CalculationParameters';
import { Grid, Row, Col } from 'react-bootstrap';
import './App.css';

export interface AppProps { }
export interface AppState {
  tableData: Array<Array<number>>;
}

export default class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      tableData: [[]]
    };

    this.onParameterChanged = this.onParameterChanged.bind(this);
  }

  onParameterChanged(params: CalculationParameters) {
    // console.log('New parameters:', params);
    this.setState({
      tableData: this.generateTableData(params, 10)
    });
  }

  generateTableData(params: CalculationParameters, maxYears: number): Array<Array<number>> {
    // let data = [];
    for (let i = 0; i <= maxYears; i++) {
      let row = [];
      row.push(i); // end of year
      row.push(params.annualIncome);
      row.push(params.annualExpenses);
    }
    return [[]];
  }

  render() {
    let data = [[0, 40000, 20000, 2935, 30750, 30750]];
    data = this.state.tableData;
    return (
      <div>
        <Grid>
          <Row>
            <Col xs={6} xsOffset={3}>
              <ParameterForm onParameterChanged={this.onParameterChanged} />
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
              data={data}
            />
          </Row>
        </Grid>
      </div>
    );
  }
}
