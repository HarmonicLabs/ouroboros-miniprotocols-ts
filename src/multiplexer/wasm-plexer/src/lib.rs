use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};

use std::io::Cursor;
use wasm_bindgen::prelude::*;

// MiniProtocol IDs as per spec
#[derive(Clone, Copy, Debug)]
pub enum MiniProtocol {
    Handshake = 0,
    ChainSync = 2,
    BlockFetch = 3,
    TxSubmission = 4,
    LocalChainSync = 5,
    LocalTxSubmission = 6,
    LocalStateQuery = 7,
    KeepAlive = 8,
    LocalTxMonitor = 9,
    PeerSharing = 10,
}

impl MiniProtocol {
    pub fn from_u16(id: u16) -> Option<Self> {
        match id {
            0 => Some(MiniProtocol::Handshake),
            2 => Some(MiniProtocol::ChainSync),
            3 => Some(MiniProtocol::BlockFetch),
            4 => Some(MiniProtocol::TxSubmission),
            5 => Some(MiniProtocol::LocalChainSync),
            6 => Some(MiniProtocol::LocalTxSubmission),
            7 => Some(MiniProtocol::LocalStateQuery),
            8 => Some(MiniProtocol::KeepAlive),
            9 => Some(MiniProtocol::LocalTxMonitor),
            10 => Some(MiniProtocol::PeerSharing),
            _ => None,
        }
    }
}

// Multiplexer header
#[derive(Debug)]
pub struct MultiplexerHeader {
    pub transmission_time: u32,
    pub has_agency: bool,
    pub protocol: MiniProtocol,
    pub payload_length: u16,
}

// Wrap multiplexer message
#[wasm_bindgen]
pub fn wrap_multiplexer_message(payload: &[u8], protocol: u16, has_agency: bool) -> Vec<u8> {
    let mut buf = Vec::with_capacity(payload.len() + 8);

    // Transmission time (microseconds since epoch, approximated)
    let time = (js_sys::Date::now() * 1000.0) as u32;
    buf.write_u32::<BigEndian>(time).unwrap();

    // Agency and protocol
    let agency_and_protocol = if has_agency { 0 } else { 0x8000 } | (protocol & 0x7FFF);
    buf.write_u16::<BigEndian>(agency_and_protocol).unwrap();

    // Payload length
    buf.write_u16::<BigEndian>(payload.len() as u16).unwrap();

    // Payload
    buf.extend_from_slice(payload);

    buf
}

// Unwrap multiplexer message
#[wasm_bindgen]
pub fn unwrap_multiplexer_message(message: &[u8]) -> Result<JsValue, JsValue> {
    if message.len() < 8 {
        return Err("Message too short".into());
    }

    let mut cursor = Cursor::new(message);
    let transmission_time = cursor.read_u32::<BigEndian>().unwrap();
    let agency_and_protocol = cursor.read_u16::<BigEndian>().unwrap();
    let payload_length = cursor.read_u16::<BigEndian>().unwrap();

    let has_agency = (agency_and_protocol & 0x8000) == 0;
    let protocol_id = agency_and_protocol & 0x7FFF;
    let protocol = MiniProtocol::from_u16(protocol_id).ok_or("Invalid protocol")?;

    let payload_start = 8;
    if message.len() < payload_start + payload_length as usize {
        return Err("Incomplete payload".into());
    }

    let payload = &message[payload_start..payload_start + payload_length as usize];

    let header = MultiplexerHeader {
        transmission_time,
        has_agency,
        protocol,
        payload_length,
    };

    let result = js_sys::Object::new();
    js_sys::Reflect::set(
        &result,
        &"transmissionTime".into(),
        &header.transmission_time.into(),
    )
    .unwrap();
    js_sys::Reflect::set(&result, &"hasAgency".into(), &header.has_agency.into()).unwrap();
    js_sys::Reflect::set(&result, &"protocol".into(), &protocol_id.into()).unwrap();
    js_sys::Reflect::set(
        &result,
        &"payloadLength".into(),
        &header.payload_length.into(),
    )
    .unwrap();
    js_sys::Reflect::set(
        &result,
        &"payload".into(),
        &js_sys::Uint8Array::from(payload),
    )
    .unwrap();

    Ok(result.into())
}

// Buffer for accumulating chunks and processing frames
#[wasm_bindgen]
pub struct MultiplexerBuffer {
    buffer: Vec<u8>,
}

#[wasm_bindgen]
impl MultiplexerBuffer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> MultiplexerBuffer {
        MultiplexerBuffer { buffer: Vec::new() }
    }

    #[wasm_bindgen]
    pub fn append_chunk(&mut self, chunk: &[u8]) {
        self.buffer.extend_from_slice(chunk);
    }

    #[wasm_bindgen]
    pub fn process_frames(&mut self) -> Vec<JsValue> {
        let mut frames = Vec::new();

        while self.buffer.len() >= 8 {
            let mut cursor = Cursor::new(&self.buffer[..8]);
            let _transmission_time = cursor.read_u32::<BigEndian>().unwrap();
            let _agency_and_protocol = cursor.read_u16::<BigEndian>().unwrap();
            let payload_length = cursor.read_u16::<BigEndian>().unwrap();

            let frame_len = 8 + payload_length as usize;
            if self.buffer.len() < frame_len {
                break;
            }

            let frame = &self.buffer[..frame_len];
            match unwrap_multiplexer_message(frame) {
                Ok(frame_data) => frames.push(frame_data),
                Err(_e) => {
                    web_sys::console::error_1(
                        &format!("Invalid frame, skipping: {:?}", frame).into(),
                    );
                    // Skip this frame
                    self.buffer.drain(..frame_len);
                    continue;
                }
            }

            self.buffer.drain(..frame_len);
        }

        frames
    }

    #[wasm_bindgen]
    pub fn buffer_len(&self) -> usize {
        self.buffer.len()
    }
}
