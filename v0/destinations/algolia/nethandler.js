const { sendRequest } = require("../../../adapters/network");
const {
  trimResponse,
  nodeSysErrorToStatus
} = require("../../../adapters/utils/networkUtils");
const { ErrorBuilder } = require("../../util/index");

const responseHandler = (dresponse, metadata) => {
  let status;
  // success case
  if (dresponse.success) {
    const trimmedResponse = trimResponse(dresponse);
    if (trimmedResponse.status >= 200 && trimmedResponse.status < 300) {
      status = 200;
      const message = trimmedResponse.statusText;
      const destination = {
        response: trimmedResponse,
        status: trimmedResponse.status
      };
      const apiLimit = {
        available: "",
        resetAt: ""
      };
      return {
        status,
        message,
        destination,
        apiLimit,
        metadata
      };
    }
    // fall back case
    throw new ErrorBuilder()
      .setStatus(400)
      .setMessage(`Request rejected due to bad request.`)
      .setDestinationResponse({ ...trimmedResponse, success: false })
      .setMetadata(metadata)
      .isTransformerNetworkFailure(true)
      .build();
  }
  // failure case
  const { response } = dresponse.response;
  if (!response && dresponse.response && dresponse.response.code) {
    const nodeSysErr = nodeSysErrorToStatus(dresponse.response.code);
    throw new ErrorBuilder()
      .setStatus(nodeSysErr.status || 400)
      .setMessage(nodeSysErr.message)
      .setMetadata(metadata)
      .isTransformerNetworkFailure(true)
      .build();
  } else {
    const trimmedErrorResponse = trimResponse(dresponse.response);
    throw new ErrorBuilder()
      .setStatus(trimmedErrorResponse.status || 400)
      .setMessage(
        `Authentication or destination side error : ${trimmedErrorResponse.statusText}`
      )
      .setDestinationResponse({ ...trimmedErrorResponse, success: false })
      .setMetadata(metadata)
      .isTransformerNetworkFailure(true)
      .build();
  }
};

const sendData = async payload => {
  const { metadata } = payload;
  const res = await sendRequest(payload);
  const parsedResponse = responseHandler(res, metadata);
  return parsedResponse;
};

module.exports = { sendData };
