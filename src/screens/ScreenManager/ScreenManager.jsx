import React from 'react'
import AppLayout from '../../components/AppLayout'
import { Box } from '@mui/material'
import Screens from './Screens'
import AddScreen from './AddScreen'
import ScreenControl from './ScreenControl'

function ScreenManager() {
  return (
    <AppLayout title={"Screen Manager"} >
      <Box sx={{width:'100%',display:'flex',justifyContent:'space-evenly'}}>
        <Box sx={{width:'90%'}} >
        <Screens/>
      </Box>
      <Box sx={{width:'30%',overflowY:'auto',
        
      }}>
        <AddScreen/>
        <ScreenControl/>
      </Box>
      </Box>
    </AppLayout>
  )
}

export default ScreenManager