import React, { Component } from 'react';
import DataTable from './components/DataTable';
import ParameterForm from './components/ParameterForm';
import './App.css';

class App extends Component {
  render() {
    let data = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    return (
      <div>
        <ParameterForm />
        <DataTable headers={['one', 'two', 'three']} data={data} />
      </div>
    );
  }
}

export default App;
