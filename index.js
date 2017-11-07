'use strict';

//definition library
const aws = require('aws-sdk');
const co = require('co');

//difinition variables
const config = new aws.ConfigService();

exports.handler = (event, context, callback) => {
  console.log('start function');

  // event params
  console.log(JSON.stringify(event));

  co(function* () {
    // event
    const invokingEvent = JSON.parse(event.invokingEvent);
    console.log(JSON.stringify(invokingEvent));
    const configurationItem = invokingEvent.configurationItem;
    const configuration = invokingEvent.configurationItem.configuration;

    // evaluate compliance
    const complianceType = evaluateCompliance(configuration);

    // put evaluations
    yield putEvaluations(complianceType, configurationItem);

    return null;
  }).then(onEnd).catch(onError);

  // evaluate compliance
  function evaluateCompliance(configuration) {
    if (event.eventLeftScope) {
      const complianceType = 'NOT_APPLICABLE';
      return complianceType;
    } else {
      const nonCompliant = configuration.ipPermissions.some((ipPermission) => {
        if (ipPermission.fromPort != 80 && ipPermission.fromPort != 443) {
          const publicIngress = ipPermission.ipRanges.some((ipRange) => {
            return (ipRange === '0.0.0.0/0');
          });
          return publicIngress;
        }
      });
      if (nonCompliant) {
        const complianceType = 'NON_COMPLIANT';
        return complianceType;
      } else {
        const complianceType = 'COMPLIANT';
        return complianceType;
      }
    }
  }

  // put evaluations
  function putEvaluations(complianceType, configurationItem) {
    return new Promise((resolve, reject) => {
      const params = {
        ResultToken: event.resultToken,
        Evaluations: [
          {
            ComplianceResourceId: configurationItem.resourceId,
            ComplianceResourceType: configurationItem.resourceType,
            ComplianceType: complianceType,
            OrderingTimestamp: configurationItem.configurationItemCaptureTime
          }
        ]
      };
      console.log(JSON.stringify(params));
      config.putEvaluations(params, (error, data) => {
        if (error) {
          reject(error);
        } else {
          console.log(JSON.stringify(data));
          resolve(null);
        }
      });
    });
  }

  // end
  function onEnd() {
    console.log('finish function');
    callback(null, 'succeed');
  }

  // error
  function onError(error) {
    console.log(error, error.stack);
    callback(error, error.stack);
  }
};