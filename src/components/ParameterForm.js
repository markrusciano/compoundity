import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, ControlLabel, InputGroup } from 'react-bootstrap';

export default class ParameterForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            annualIncome: 50000,
            annualSavings: 30000,
            annualExpenses: 20000,
            savingsRate: 60,
            portfolioValue: 0,
            annualReturn: 5,
            withdrawalRate: 4
        };

        this.handleInputChange = this.handleInputChange.bind(this);
    }

    handleInputChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        this.setState({
            [name]: value
        });
    }

    render() {
        return <form>
            <ParamInput
                id='annualIncome'
                label='Annual Income'
                value={this.state.annualIncome}
                type='number'
                onChange={this.handleInputChange}
                addon='$'
            ></ParamInput>
        </form>;
    }
}

const ParamInput = ({ id, label, value, type, onChange, addon }) =>
    <FormGroup controlId={id}>
        <ControlLabel>{label}</ControlLabel>
        <InputGroup>
            <InputGroup.Addon>{addon}</InputGroup.Addon>
            <FormControl
                type={type}
                name={id}
                value={value}
                onChange={onChange} />
        </InputGroup>
    </FormGroup>