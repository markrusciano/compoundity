import * as React from 'react';
import { Table } from 'react-bootstrap';

export interface DataTableProps {
    headers: Array<string>;
    data: Array<Array<string>>;
}

export default class DataTable extends React.Component<DataTableProps> {
    render() {
        let headers = [];
        for (let i = 0; i < this.props.headers.length; i++) {
            headers.push(
                <th key={`header${i}`}>{this.props.headers[i]}</th>);
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
            <Table striped={true} bordered={true} condensed={true} hover={true}>
                <thead>
                    <tr>{headers}</tr>
                </thead>

                <tbody>{rows}</tbody>
            </Table>
        );
    }
}
