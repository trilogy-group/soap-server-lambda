'use strict';

const Parser = require('fast-xml-parser');
const SoapError = require('./SoapError.js');

const parser = new Parser.XMLBuilder({
  ignoreAttributes: false,
  attributesGroupName: 'attributes',
  suppressEmptyNode: true,
});

let soapBodyStart = `<?xml version='1.0' encoding='UTF-8'?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Body>
`;

let soapBodyEnd = `   </soapenv:Body>
</soapenv:Envelope>`;

/**
 * Soap response body handler class
 *
 * This class will be responsible for creating the soap response from the actual response.
 */
class SoapResponseBodyHandler {
  /**
   * Build the success response from the actual response object
   *
   * @param {Object} response the response object
   */
  async success(response) {
    let responseBody = soapBodyStart;
    try {
      responseBody += parser.build(response);
    } catch (error) {
      console.error(error);
      responseBody += parser.build(this.createFaultResponse(
          new SoapError(500, 'Couldn\'t convert the response in xml'),
      ));
    }
    responseBody += soapBodyEnd;
    return responseBody;
  }

  /**
   * Build the error/fault response
   *
   * @param {SoapError} error the error object
   */
  async fault(error) {
    try {
      if (error instanceof Error) {
        error = this.createFaultResponse(error);
      } else if (error.Fault) {
        error = {
          "soapenv:Fault": error.Fault
        }
      };
    } catch (ex) {
      error = this.createFaultResponse(error);
    }
    return soapBodyStart + parser.build(error) + soapBodyEnd;
  }

  createFaultResponse(error) {
    return {
      "soapenv:Fault": {
        faultcode: "fns:API_ERROR",
        faultstring: error.message,
        detail: {
          "fns:MalformedQueryFault": {
            "fns:FaultCode": "API_ERROR",
            "fns:FaultMessage": error.message
          }
        },
        attributes: { "xmlns:fns": "http://fault.api.zuora.com/" }
      }
    }
  };
}

module.exports = SoapResponseBodyHandler;
