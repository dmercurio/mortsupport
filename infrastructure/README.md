# Infrastructure

## Manual Configuration - Google Cloud Console

### Create Billing Account
* [Billing](https://console.cloud.google.com/billing) > Create Account > ...
* add Billing Account ID to `Pulumi.staging.yaml` and `Pulumi.prod.yaml`

### Create Folder
* [Cloud Resource Manager](https://console.cloud.google.com/cloud-resourceManager) > Create Folder > ...
* add Folder ID to `Pulumi.staging.yaml` and `Pulumi.prod.yaml`

## Setup

### Install Pulumi
```bash
brew install pulumi/tap/pulumi
```

## Pulumi Worflow

### Prerequisites
* Populate `Pulumi.staging.yaml`, `Pulumi.prod.yaml`, etc with values for the appropriate variables
** e.g. the `folderId` and `billingAccount` from Google Cloud Console, desired `location`
** optionally provide an existing GCP project using `gcp:project`

### Stacks
```bash
pulumi stack ls
pulumi stack select staging
```
```bash
pulumi stack init
```

### Creating / Editing
```bash
pulumi up
```

### Destroying
```bash
pulumi destroy
```
