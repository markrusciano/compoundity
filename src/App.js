import React from 'react';
import DataTable from './components/DataTable';
import './App.css';

class App extends React.Component {
  render() {
    let data = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    return (
      <div className="App">
        <DataTable headers={['one', 'two', 'three']} data={data} />
      </div>
    );
  }
}

export default App;
