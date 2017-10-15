import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, ControlLabel, InputGroup } from 'react-bootstrap';

export default class ParameterForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            annualIncome: '50000',
            annualSavings: '30000',
            annualExpenses: '20000',
            savingRate: '60',
            portfolioValue: '0',
            annualReturn: '5',
            withdrawalRate: '4'
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

        this.props.onParameterChanged && this.props.onParameterChanged(this.state);
    }

    render() {
        return <form>
            <ParamInput
                id='annualIncome'
                label='Annual Income'
                value={this.state.annualIncome}
                type='number'
                onChange={this.handleInputChange}
                preAddon='$'
            ></ParamInput>

            <ParamInput
                id='annualSavings'
                label='Annual Savings'
                value={this.state.annualSavings}
                type='number'
                onChange={this.handleInputChange}
                preAddon='$'
            ></ParamInput>

            <ParamInput
                id='annualExpenses'
                label='Annual Expenses'
                value={this.state.annualExpenses}
                type='number'
                onChange={this.handleInputChange}
                preAddon='$'
            ></ParamInput>

            <ParamInput
                id='savingRate'
                label='Saving Rate'
                value={this.state.savingRate}
                type='number'
                onChange={this.handleInputChange}
                postAddon='%'
            ></ParamInput>

            <ParamInput
                id='portfolioValue'
                label='PortfolioValue'
                value={this.state.portfolioValue}
                type='number'
                onChange={this.handleInputChange}
                preAddon='$'
            ></ParamInput>

            <ParamInput
                id='annualReturn'
                label='Annual Return'
                value={this.state.annualReturn}
                type='number'
                onChange={this.handleInputChange}
                postAddon='%'
            ></ParamInput>

            <ParamInput
                id='withdrawalRate'
                label='Withdrawal Rate'
                value={this.state.withdrawalRate}
                type='number'
                onChange={this.handleInputChange}
                postAddon='%'
            ></ParamInput>
        </form>;
    }
}

ParameterForm.propTypes = {
    onParameterChanged: PropTypes.func
}

const ParamInput = ({ id, label, value, type, onChange, preAddon, postAddon }) =>
    <FormGroup controlId={id}>
        <ControlLabel>{label}</ControlLabel>
        <InputGroup>
            {preAddon && <InputGroup.Addon>{preAddon}</InputGroup.Addon>}
            <FormControl
                type={type}
                name={id}
                value={value}
                onChange={onChange} />
            {postAddon && <InputGroup.Addon>{postAddon}</InputGroup.Addon>}
        </InputGroup>
    </FormGroup>