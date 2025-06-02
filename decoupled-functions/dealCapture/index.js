module.exports = async function (context, req) {
    context.log('dealCapture function received a request');

    // Echo back whatever was sent in the body
    const receivedPayload = req.body;

    context.res = {
        status: 200,
        body: {
            message: "Received your payload successfully.",
            data: receivedPayload
        }
    };
}
