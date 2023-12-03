import { Container } from "react-bootstrap"
import VideoCall from "./VideoCall"

export const Home = () => {

    console.log("hello")
    return (
        <Container className="fs-2">
            <VideoCall/>
        </Container>
    )
}