# Prior Authorization System

A modern web application for managing healthcare prior authorizations efficiently.

![Prior Authorization System Diagram](public/PriorAuthSysD.png)

## Overview

This application streamlines the prior authorization process by providing a centralized platform for managing patient authorizations, code validations, and status tracking.

## Features

- Patient information management
- ICD and CPT code validation
- Authorization status tracking
- Override capabilities with documentation

## Tech Stack

- Next.js 13+ with TypeScript
- Shadcn/ui
- DynamoDB
- OpenAI
- Ragie.AI
- AWS Lambda

## Getting Started
1. Visit URL: https://main.d3v68ywpyu0w2i.amplifyapp.com/
2. Login with credentials:
    - Username: any string value
    - Password: any string value 
    - Should redirect to authorizations page: https://main.d3v68ywpyu0w2i.amplifyapp.com/authorizations

3. Use dummy visit notes in medical_prior_authorization/test folder to uplaod by clicking on the upload button in top right corner

## Features

- Create new authorization request
- Edit authorization requests
- Validate authorization requests edits prior to saving
- Submit authorization requests for review
- View authorization requests in list and detail view
