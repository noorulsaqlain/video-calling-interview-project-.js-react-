import mongoos from 'mongoos';
 
const userSchema = new mongoos.Schema({
    name:{
        type: String,
        required:true,
    },
    email:{
        type: String,
        required:true,
        unique:true,
    },
    profileImage:{
        type: String,
        default:"",
    },
    clerkId:{
        type: String,
        required:true,
        unique:true,
    }
},
    {timestamps: true}  //crated date   or    updates date 
)

const User = mongoos.model("User",userSchema)

export default User;