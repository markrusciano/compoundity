import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';

export default class DataTable extends React.Component {
    render() {
        let headers = [];
        for (let i = 0; i < this.props.headers.length; i++) {
            headers.push(
                <th>{this.props.headers[i]}</th>);
        }

        let rows = [];
        for (let i = 0; i < this.props.data.length; i++) {
            let row = this.props.data[i];
            let rowId = `rows${i}`;
            let cells = [];
            for (let j = 0; j < row.length; j++) {
                let cellId = `cell${i}:${j}`;
                let cellData = row[j];
                cells.push(
                    <td key={cellId} id={cellId}>{cellData}</td>);
            }
            rows.push(<tr key={rowId} id={rowId}>{cells}</tr>);
        }

        return (
            <Table striped bordered condensed hover>
                <thead>
                    <tr>{headers}</tr>
                </thead>

                <tbody>{rows}</tbody>
            </Table>
        );
    }
}

DataTable.propTypes = {
    headers: PropTypes.array.isRequired,
    data: PropTypes.array.isRequired,
};
